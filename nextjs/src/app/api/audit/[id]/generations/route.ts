import { NextResponse } from "next/server";

import { buildRewritePrompt, parseRewriteResponse } from "@/lib/audit/rewrite";
import { createSSRSassClient } from "@/lib/supabase/server";
import type { Database, TablesInsert } from "@/lib/types";
import { canUseAi, consumeAiCredit, getUsageSnapshot } from "@/lib/usage/limits";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SupabaseClient = ReturnType<Awaited<ReturnType<typeof createSSRSassClient>>["getSupabaseClient"]>;

async function loadAudit(client: SupabaseClient, auditId: string, ownerId: string) {
  const { data, error } = await client
    .from("listing_audits")
    .select("*")
    .eq("id", auditId)
    .eq("owner", ownerId)
    .single();

  if (error || !data) {
    throw error ?? new Error("Audit not found.");
  }

  return data;
}

async function loadCompetitors(client: SupabaseClient, auditId: string, ownerId: string) {
  const { data, error } = await client
    .from("competitors")
    .select("title, comparison_json")
    .eq("listing_audit_id", auditId)
    .eq("owner", ownerId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    throw error;
  }

  return data;
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
    .from("ai_generations")
    .select("id, kind, output_json, model_name, created_at")
    .eq("listing_audit_id", id)
    .eq("owner", user.id)
    .in("kind", ["title_rewrite", "bullets_rewrite"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to load generations.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  const usage = await getUsageSnapshot(client, user.id);

  return NextResponse.json({ generations: data, usage });
}

export async function POST(_request: Request, context: RouteContext) {
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

  const quotaCheck = await canUseAi(client, user.id);
  if (!quotaCheck.ok) {
    return NextResponse.json(
      {
        error: quotaCheck.message,
        usage: quotaCheck.usage,
      },
      { status: 403 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured.",
        usage: quotaCheck.usage,
      },
      { status: 500 },
    );
  }

  let audit: Database["public"]["Tables"]["listing_audits"]["Row"];
  let competitors: { title: string | null; comparison_json: Database["public"]["Tables"]["competitors"]["Row"]["comparison_json"] }[];

  try {
    audit = await loadAudit(client, id, user.id);
    competitors = await loadCompetitors(client, id, user.id);
  } catch (loadError) {
    return NextResponse.json(
      {
        error: "Failed to load rewrite context.",
        details: loadError instanceof Error ? loadError.message : "Context loading failed.",
      },
      { status: 500 },
    );
  }

  const prompt = buildRewritePrompt({
    title: audit.product_title ?? "",
    bullets: Array.isArray(audit.bullet_points) ? (audit.bullet_points as string[]) : [],
    description: audit.product_description,
    backendKeywords: audit.backend_keywords,
    issues: Array.isArray(audit.issues_json) ? (audit.issues_json as never[]) : [],
    recommendations: Array.isArray(audit.recommendations_json) ? (audit.recommendations_json as never[]) : [],
    competitors: competitors.map((competitor) => ({
      title: competitor.title,
      comparison_json:
        competitor.comparison_json && typeof competitor.comparison_json === "object"
          ? (competitor.comparison_json as {
              competitorOnlyKeywords?: string[];
              competitorClaims?: string[];
            })
          : undefined,
    })),
  });

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  });

  const aiPayload = (await aiResponse.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };

  if (!aiResponse.ok) {
    return NextResponse.json(
      {
        error: "AI rewrite request failed.",
        details: aiPayload.error?.message || "Unknown provider error.",
      },
      { status: 500 },
    );
  }

  const content = aiPayload.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      {
        error: "AI provider returned an empty response.",
      },
      { status: 500 },
    );
  }

  let rewrite;
  try {
    rewrite = parseRewriteResponse(content);
  } catch (parseError) {
    return NextResponse.json(
      {
        error: "Failed to parse AI rewrite response.",
        details: parseError instanceof Error ? parseError.message : "Invalid JSON received.",
      },
      { status: 500 },
    );
  }

  const commonPayload = {
    owner: user.id,
    project_id: audit.project_id,
    listing_audit_id: audit.id,
    model_name: model,
    prompt_version: "v1",
    tokens_input: aiPayload.usage?.prompt_tokens ?? null,
    tokens_output: aiPayload.usage?.completion_tokens ?? null,
  };

  const rows: TablesInsert<"ai_generations">[] = [
    {
      ...commonPayload,
      kind: "title_rewrite",
      input_json: {
        title: audit.product_title,
        competitorCount: competitors.length,
      },
      output_json: {
        summary: rewrite.summary,
        titleOptions: rewrite.titleOptions,
      },
    },
    {
      ...commonPayload,
      kind: "bullets_rewrite",
      input_json: {
        bullets: audit.bullet_points,
        competitorCount: competitors.length,
      },
      output_json: {
        summary: rewrite.summary,
        bulletOptions: rewrite.bulletOptions,
      },
    },
  ];

  const { data, error } = await client
    .from("ai_generations")
    .insert(rows)
    .select("id, kind, output_json, model_name, created_at");

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to save AI generations.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  const creditResult = await consumeAiCredit(client, user.id);

  return NextResponse.json({
    generations: data,
    rewrite,
    usage: creditResult.usage,
  });
}
