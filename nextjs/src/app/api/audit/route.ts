import { NextResponse } from "next/server";

import { scoreListingAudit } from "@/lib/audit/scorer";
import { createSSRSassClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/types";
import { canUseAudit, consumeAuditCredit, getUsageSnapshot } from "@/lib/usage/limits";

async function ensureProjectId(
  client: ReturnType<Awaited<ReturnType<typeof createSSRSassClient>>["getSupabaseClient"]>,
  ownerId: string,
) {
  const { data: existingProject } = await client
    .from("projects")
    .select("id")
    .eq("owner", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingProject?.id) {
    return existingProject.id;
  }

  const { data: createdProject, error: projectError } = await client
    .from("projects")
    .insert({
      owner: ownerId,
      name: "General Audits",
      marketplace: "amazon.com",
    })
    .select("id")
    .single();

  if (projectError) {
    throw projectError;
  }

  return createdProject.id;
}

type AuditRequestBody = {
  asin?: string;
  marketplace?: string;
  locale?: string;
  listingUrl?: string;
  productTitle?: string;
  bulletPoints?: string[] | string;
  productDescription?: string;
  backendKeywords?: string;
  brandName?: string;
  categoryName?: string;
  priceAmount?: number | null;
  currencyCode?: string;
  imageCount?: number | null;
};

export async function GET(request: Request) {
  const supabase = await createSSRSassClient();
  const client = supabase.getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const limitParam = Number(requestUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : 10;

  const { data, error } = await client
    .from("listing_audits")
    .select(
      "id, asin, marketplace, product_title, overall_score, seo_score, conversion_score, compliance_score, readability_score, created_at, status",
    )
    .eq("owner", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to load audit history.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  const usage = await getUsageSnapshot(client, user.id);

  return NextResponse.json({ audits: data, usage });
}

function normalizeBullets(bulletPoints: AuditRequestBody["bulletPoints"]): string[] {
  if (Array.isArray(bulletPoints)) {
    return bulletPoints.map((item) => item.trim()).filter(Boolean);
  }

  return (bulletPoints ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const supabase = await createSSRSassClient();
  const client = supabase.getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quotaCheck = await canUseAudit(client, user.id);
  if (!quotaCheck.ok) {
    return NextResponse.json(
      {
        error: quotaCheck.message,
        usage: quotaCheck.usage,
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as AuditRequestBody;
  const title = (body.productTitle ?? "").trim();
  const bullets = normalizeBullets(body.bulletPoints);
  const description = (body.productDescription ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Product title is required." }, { status: 400 });
  }

  if (bullets.length === 0) {
    return NextResponse.json({ error: "At least one bullet point is required." }, { status: 400 });
  }

  const auditResult = scoreListingAudit({
    asin: body.asin?.trim(),
    marketplace: body.marketplace?.trim() || "amazon.com",
    locale: body.locale?.trim() || "en",
    listingUrl: body.listingUrl?.trim(),
    productTitle: title,
    bulletPoints: bullets,
    productDescription: description,
    backendKeywords: body.backendKeywords?.trim(),
    brandName: body.brandName?.trim(),
    categoryName: body.categoryName?.trim(),
    priceAmount: body.priceAmount ?? null,
    currencyCode: body.currencyCode?.trim() || "USD",
    imageCount: body.imageCount ?? null,
  });

  let projectId: string;
  try {
    projectId = await ensureProjectId(client, user.id);
  } catch (projectError) {
    return NextResponse.json(
      {
        error: "Failed to prepare audit project.",
        details: projectError instanceof Error ? projectError.message : "Project setup failed.",
      },
      { status: 500 },
    );
  }

  const insertPayload: TablesInsert<"listing_audits"> = {
    owner: user.id,
    project_id: projectId,
    status: "completed",
    asin: body.asin?.trim() || null,
    marketplace: body.marketplace?.trim() || "amazon.com",
    locale: body.locale?.trim() || "en",
    listing_url: body.listingUrl?.trim() || null,
    product_title: title,
    bullet_points: auditResult.normalized.bullets,
    product_description: description || null,
    backend_keywords: body.backendKeywords?.trim() || null,
    brand_name: body.brandName?.trim() || null,
    category_name: body.categoryName?.trim() || null,
    price_amount: body.priceAmount ?? null,
    currency_code: body.currencyCode?.trim() || "USD",
    image_count: body.imageCount ?? null,
    input_json: body,
    normalized_json: auditResult.normalized,
    score_json: auditResult.scores,
    issues_json: auditResult.issues,
    recommendations_json: auditResult.recommendations,
    result_json: auditResult,
    overall_score: auditResult.scores.overall,
    seo_score: auditResult.scores.seo,
    conversion_score: auditResult.scores.conversion,
    compliance_score: auditResult.scores.compliance,
    readability_score: auditResult.scores.readability,
    analyzed_at: new Date().toISOString(),
  };

  const { data: auditRow, error: insertError } = await client
    .from("listing_audits")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        error: "Failed to save the audit.",
        details: insertError.message,
      },
      { status: 500 },
    );
  }

  const creditResult = await consumeAuditCredit(client, user.id);

  return NextResponse.json({
    audit: auditRow,
    result: auditResult,
    usage: creditResult.usage,
  });
}
