import { NextResponse } from "next/server";

import { compareCompetitor } from "@/lib/audit/competitor";
import { createSSRSassClient } from "@/lib/supabase/server";
import type { Database, TablesInsert } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CompetitorRequestBody = {
  asin?: string;
  title?: string;
  bulletPoints?: string[] | string;
  description?: string;
};

type SupabaseClient = ReturnType<Awaited<ReturnType<typeof createSSRSassClient>>["getSupabaseClient"]>;

function normalizeBullets(bulletPoints: CompetitorRequestBody["bulletPoints"]): string[] {
  if (Array.isArray(bulletPoints)) {
    return bulletPoints.map((item) => item.trim()).filter(Boolean);
  }

  return (bulletPoints ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function ensureProjectId(
  client: SupabaseClient,
  audit: Database["public"]["Tables"]["listing_audits"]["Row"],
) {
  if (audit.project_id) {
    return audit.project_id;
  }

  const { data: existingProject } = await client
    .from("projects")
    .select("id")
    .eq("owner", audit.owner)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let projectId = existingProject?.id;

  if (!projectId) {
    const { data: createdProject, error: createError } = await client
      .from("projects")
      .insert({
        owner: audit.owner,
        name: "General Audits",
        marketplace: audit.marketplace,
      })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    projectId = createdProject.id;
  }

  const { error: updateError } = await client
    .from("listing_audits")
    .update({ project_id: projectId })
    .eq("id", audit.id)
    .eq("owner", audit.owner);

  if (updateError) {
    throw updateError;
  }

  return projectId;
}

async function loadAudit(client: SupabaseClient, auditId: string, ownerId: string) {
  const { data: audit, error } = await client
    .from("listing_audits")
    .select("*")
    .eq("id", auditId)
    .eq("owner", ownerId)
    .single();

  if (error || !audit) {
    throw error ?? new Error("Audit not found.");
  }

  return audit;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSSRSassClient();
  const client = supabase.getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await client
    .from("competitors")
    .select("id, asin, title, bullet_points, description, marketplace, comparison_json, created_at")
    .eq("owner", user.id)
    .eq("listing_audit_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to load competitors.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ competitors: data });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSSRSassClient();
  const client = supabase.getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let audit: Database["public"]["Tables"]["listing_audits"]["Row"];
  try {
    audit = await loadAudit(client, id, user.id);
  } catch (auditError) {
    return NextResponse.json(
      {
        error: "Audit not found.",
        details: auditError instanceof Error ? auditError.message : "Failed to load audit.",
      },
      { status: 404 },
    );
  }

  const body = (await request.json()) as CompetitorRequestBody;
  const title = (body.title ?? "").trim();
  const bullets = normalizeBullets(body.bulletPoints);
  const description = (body.description ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Competitor title is required." }, { status: 400 });
  }

  if (bullets.length === 0) {
    return NextResponse.json({ error: "Add at least one competitor bullet." }, { status: 400 });
  }

  let projectId: string;
  try {
    projectId = await ensureProjectId(client, audit);
  } catch (projectError) {
    return NextResponse.json(
      {
        error: "Failed to prepare competitor project.",
        details: projectError instanceof Error ? projectError.message : "Project setup failed.",
      },
      { status: 500 },
    );
  }

  const comparison = compareCompetitor({
    base: {
      title: audit.product_title ?? "",
      bullets: Array.isArray(audit.bullet_points) ? (audit.bullet_points as string[]) : [],
      description: audit.product_description,
      backendKeywords: audit.backend_keywords,
    },
    competitor: {
      asin: body.asin?.trim() || "",
      title,
      bullets,
      description,
    },
  });

  const payload: TablesInsert<"competitors"> = {
    owner: user.id,
    project_id: projectId,
    listing_audit_id: audit.id,
    asin: body.asin?.trim() || `manual-${Date.now()}`,
    marketplace: audit.marketplace,
    title,
    bullet_points: bullets,
    description: description || null,
    raw_json: body,
    comparison_json: comparison,
  };

  const { data, error } = await client
    .from("competitors")
    .insert(payload)
    .select("id, asin, title, bullet_points, description, marketplace, comparison_json, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to save competitor.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ competitor: data });
}
