import type { AuditIssue, AuditRecommendation } from "@/lib/audit/scorer";

type RewriteInput = {
  title: string;
  bullets: string[];
  description?: string | null;
  backendKeywords?: string | null;
  issues: AuditIssue[];
  recommendations: AuditRecommendation[];
  competitors: {
    title: string | null;
    comparison_json?: {
      competitorOnlyKeywords?: string[];
      competitorClaims?: string[];
    };
  }[];
};

export type RewriteResult = {
  titleOptions: string[];
  bulletOptions: string[][];
  summary: string;
};

export function buildRewritePrompt(input: RewriteInput) {
  return `You are an Amazon listing optimization expert.

Return strict JSON with this shape:
{
  "summary": "short explanation",
  "titleOptions": ["...", "...", "..."],
  "bulletOptions": [
    ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
    ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"]
  ]
}

Rules:
- Output valid JSON only.
- No markdown.
- English only unless the listing is clearly in another language.
- Keep titles readable and not spammy.
- Use competitor gaps only when they improve relevance.
- Avoid unsupported claims.
- Bullet arrays must contain exactly 5 strings.

Current title:
${input.title}

Current bullets:
${input.bullets.map((bullet, index) => `${index + 1}. ${bullet}`).join("\n")}

Current description:
${input.description || "N/A"}

Backend keywords:
${input.backendKeywords || "N/A"}

Issues:
${input.issues.map((issue) => `- ${issue.title}: ${issue.detail}`).join("\n")}

Recommendations:
${input.recommendations.map((item) => `- ${item.title}: ${item.action}`).join("\n")}

Competitor context:
${input.competitors
  .slice(0, 3)
  .map(
    (competitor, index) =>
      `Competitor ${index + 1}\nTitle: ${competitor.title || "N/A"}\nKeywords: ${
        competitor.comparison_json?.competitorOnlyKeywords?.join(", ") || "N/A"
      }\nClaims: ${competitor.comparison_json?.competitorClaims?.join(" | ") || "N/A"}`,
  )
  .join("\n\n")}
`;
}

export function parseRewriteResponse(content: string): RewriteResult {
  const parsed = JSON.parse(content) as Partial<RewriteResult>;

  const titleOptions = Array.isArray(parsed.titleOptions)
    ? parsed.titleOptions.filter((item): item is string => typeof item === "string").slice(0, 3)
    : [];
  const bulletOptions = Array.isArray(parsed.bulletOptions)
    ? parsed.bulletOptions
        .filter((entry): entry is string[] => Array.isArray(entry))
        .map((entry) => entry.filter((item): item is string => typeof item === "string").slice(0, 5))
        .filter((entry) => entry.length === 5)
        .slice(0, 2)
    : [];

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "Rewrite generated from the current audit context.",
    titleOptions,
    bulletOptions,
  };
}
