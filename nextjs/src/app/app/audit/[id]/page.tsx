"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, SearchCheck, WandSparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AuditIssue = {
  id: string;
  title: string;
  detail: string;
  severity: string;
};

type AuditRecommendation = {
  id: string;
  title: string;
  action: string;
  priority: number;
};

type AuditDetail = {
  id: string;
  asin: string | null;
  marketplace: string;
  product_title: string | null;
  product_description: string | null;
  backend_keywords: string | null;
  bullet_points: string[];
  overall_score: number | null;
  seo_score: number | null;
  conversion_score: number | null;
  compliance_score: number | null;
  readability_score: number | null;
  issues_json: AuditIssue[];
  recommendations_json: AuditRecommendation[];
  created_at: string;
};

type CompetitorComparison = {
  overlapKeywords: string[];
  competitorOnlyKeywords: string[];
  missingBackendKeywordCoverage: string[];
  competitorClaims: string[];
  structuralDelta: {
    titleLengthDelta: number;
    bulletCountDelta: number;
    descriptionLengthDelta: number;
  };
  summary: {
    keywordOverlapRatio: number;
    competitorAdvantage: string[];
    yourAdvantage: string[];
  };
};

type CompetitorItem = {
  id: string;
  asin: string;
  title: string | null;
  bullet_points: string[];
  description: string | null;
  marketplace: string;
  comparison_json: CompetitorComparison;
  created_at: string;
};

type CompetitorForm = {
  asin: string;
  title: string;
  bulletPoints: string;
  description: string;
};

type GenerationItem = {
  id: string;
  kind: "title_rewrite" | "bullets_rewrite";
  output_json: {
    summary?: string;
    titleOptions?: string[];
    bulletOptions?: string[][];
  };
  model_name: string | null;
  created_at: string;
};

type UsageSnapshot = {
  plan: string;
  auditCreditsMonthly: number;
  auditsUsed: number;
  auditsRemaining: number;
  aiCreditsMonthly: number;
  aiUsed: number;
  aiRemaining: number;
  competitorCreditsMonthly: number;
  competitorsUsed: number;
  competitorsRemaining: number;
  periodStart: string;
  periodEnd: string;
};

const initialCompetitorForm: CompetitorForm = {
  asin: "",
  title: "",
  bulletPoints: "",
  description: "",
};

function normalizeCompetitor(item: CompetitorItem): CompetitorItem {
  return {
    ...item,
    bullet_points: Array.isArray(item.bullet_points) ? item.bullet_points : [],
  };
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function scoreSurface(score: number): string {
  if (score >= 80) return "border-emerald-200 bg-emerald-50";
  if (score >= 60) return "border-amber-200 bg-amber-50";
  return "border-rose-200 bg-rose-50";
}

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [competitorForm, setCompetitorForm] = useState<CompetitorForm>(initialCompetitorForm);
  const [loading, setLoading] = useState(true);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);
  const [submittingCompetitor, setSubmittingCompetitor] = useState(false);
  const [generatingRewrite, setGeneratingRewrite] = useState(false);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  useEffect(() => {
    async function loadAudit() {
      try {
        const response = await fetch(`/api/audit/${params.id}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as { audit?: AuditDetail; error?: string; details?: string };

        if (!response.ok) {
          throw new Error(data.details || data.error || "Failed to load audit.");
        }

        setAudit({
          ...data.audit!,
          bullet_points: Array.isArray(data.audit?.bullet_points) ? data.audit!.bullet_points : [],
          issues_json: Array.isArray(data.audit?.issues_json) ? data.audit!.issues_json : [],
          recommendations_json: Array.isArray(data.audit?.recommendations_json) ? data.audit!.recommendations_json : [],
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load audit.");
      } finally {
        setLoading(false);
      }
    }

    async function loadCompetitors() {
      try {
        const response = await fetch(`/api/audit/${params.id}/competitors`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as { competitors?: CompetitorItem[]; usage?: UsageSnapshot };
        if (response.ok) {
          setCompetitors((data.competitors || []).map((item) => normalizeCompetitor(item)));
          if (data.usage) {
            setUsage(data.usage);
          }
        }
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setCompetitorsLoading(false);
      }
    }

    async function loadGenerations() {
      try {
        const response = await fetch(`/api/audit/${params.id}/generations`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as { generations?: GenerationItem[]; usage?: UsageSnapshot };
        if (response.ok) {
          setGenerations(data.generations || []);
          setUsage(data.usage || null);
        }
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setGenerationsLoading(false);
      }
    }

    loadAudit();
    loadCompetitors();
    loadGenerations();
  }, [params.id]);

  async function handleCompetitorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingCompetitor(true);
    setCompetitorError(null);

    try {
      const response = await fetch(`/api/audit/${params.id}/competitors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...competitorForm,
          bulletPoints: competitorForm.bulletPoints,
        }),
      });

      const data = (await response.json()) as {
        competitor?: CompetitorItem;
        usage?: UsageSnapshot;
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        if (data.usage) {
          setUsage(data.usage);
        }
        throw new Error(data.details || data.error || "Failed to save competitor.");
      }

      if (data.competitor) {
        const normalizedCompetitor = normalizeCompetitor(data.competitor as CompetitorItem);
        setCompetitors((prev) => [normalizedCompetitor, ...prev]);
      }
      if (data.usage) {
        setUsage(data.usage);
      }
      setCompetitorForm(initialCompetitorForm);
    } catch (submitError) {
      setCompetitorError(submitError instanceof Error ? submitError.message : "Failed to save competitor.");
    } finally {
      setSubmittingCompetitor(false);
    }
  }

  async function handleGenerateRewrite() {
    setGeneratingRewrite(true);
    setGenerationError(null);

    try {
      const response = await fetch(`/api/audit/${params.id}/generations`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        generations?: GenerationItem[];
        usage?: UsageSnapshot;
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        if (data.usage) {
          setUsage(data.usage);
        }
        throw new Error(data.details || data.error || "Failed to generate rewrite.");
      }

      setGenerations(data.generations || []);
      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (generationRequestError) {
      setGenerationError(
        generationRequestError instanceof Error ? generationRequestError.message : "Failed to generate rewrite.",
      );
    } finally {
      setGeneratingRewrite(false);
    }
  }

  const titleGeneration = generations.find((item) => item.kind === "title_rewrite");
  const bulletsGeneration = generations.find((item) => item.kind === "bullets_rewrite");
  const topIssues = audit?.issues_json.slice(0, 3) || [];
  const topRecommendations = audit?.recommendations_json.slice(0, 3) || [];

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Audit unavailable</AlertTitle>
          <AlertDescription>{error || "The audit could not be loaded."}</AlertDescription>
        </Alert>
        <Link className="inline-flex items-center text-sm font-medium text-primary hover:underline" href="/app/audit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to audits
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,#fde68a,transparent_28%),linear-gradient(180deg,#fffaf0_0%,#fff 45%,#f8fafc 100%)] shadow-sm">
        <div className="grid gap-8 px-6 py-8 xl:grid-cols-[minmax(0,1.05fr)_320px] xl:px-8">
          <div>
            <Link className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-950" href="/app/audit">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to audits
            </Link>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Stages 2 and 3</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{audit.product_title || "Untitled audit"}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              This is the working record for one listing. Review the score and fixes, add competitor context, then
              generate new title and bullet options from the same audit.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{audit.marketplace}</span>
              {audit.asin ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">ASIN {audit.asin}</span> : null}
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{new Date(audit.created_at).toLocaleString()}</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                ["SEO", audit.seo_score ?? 0],
                ["Conversion", audit.conversion_score ?? 0],
                ["Compliance", audit.compliance_score ?? 0],
                ["Readability", audit.readability_score ?? 0],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-2xl border p-4 ${scoreSurface(Number(value))}`}>
                  <div className="text-sm text-slate-500">{label}</div>
                  <div className={`mt-2 text-3xl font-semibold ${scoreTone(Number(value))}`}>{value || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Overall score</div>
            <div className={`mt-3 text-6xl font-semibold ${scoreTone(audit.overall_score ?? 0)}`}>{audit.overall_score ?? "—"}</div>
            {usage ? (
              <div className="mt-6 space-y-3">
                {[
                  ["Audit", `${usage.auditsRemaining} / ${usage.auditCreditsMonthly}`],
                  ["AI rewrite", `${usage.aiRemaining} / ${usage.aiCreditsMonthly}`],
                  ["Competitor", `${usage.competitorsRemaining} / ${usage.competitorCreditsMonthly}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label} credits left</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="rounded-[28px] border-slate-200/80 bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle>Priority Findings</CardTitle>
            <CardDescription>What is wrong right now and what to fix before rewrite.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">Top issues</div>
              <div className="space-y-3">
                {topIssues.length ? (
                  topIssues.map((issue) => (
                    <div key={issue.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{issue.title}</div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs uppercase tracking-wide text-slate-700">
                          {issue.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{issue.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No saved issues.</div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">Top actions</div>
              <div className="space-y-3">
                {topRecommendations.length ? (
                  topRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="font-medium text-slate-900">{recommendation.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{recommendation.action}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No saved recommendations.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80 bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle>Source Listing Snapshot</CardTitle>
            <CardDescription>This is the source text you are improving through the rest of the workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Title</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {audit.product_title || "—"}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Bullets</div>
              <div className="space-y-2">
                {audit.bullet_points.length ? (
                  audit.bullet_points.map((bullet, index) => (
                    <div key={`${audit.id}-bullet-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      {bullet}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No bullets saved.</div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Description</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {audit.product_description || "No description provided."}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Backend Keywords</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {audit.backend_keywords || "No backend keywords provided."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="rounded-[28px] border-slate-200/80 bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle>Stage 2 · Add Competitor Context</CardTitle>
            <CardDescription>Paste one competing listing to expose keyword gaps and claim differences.</CardDescription>
          </CardHeader>
          <CardContent>
            {competitorError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Competitor save failed</AlertTitle>
                <AlertDescription>{competitorError}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-4" onSubmit={handleCompetitorSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="competitor-asin">
                  Competitor ASIN
                </label>
                <Input
                  id="competitor-asin"
                  value={competitorForm.asin}
                  onChange={(event) => setCompetitorForm((prev) => ({ ...prev, asin: event.target.value }))}
                  placeholder="B0XXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="competitor-title">
                  Competitor Title
                </label>
                <Textarea
                  id="competitor-title"
                  className="min-h-[100px]"
                  value={competitorForm.title}
                  onChange={(event) => setCompetitorForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Paste competitor title"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="competitor-bullets">
                  Competitor Bullets
                </label>
                <Textarea
                  id="competitor-bullets"
                  className="min-h-[150px]"
                  value={competitorForm.bulletPoints}
                  onChange={(event) => setCompetitorForm((prev) => ({ ...prev, bulletPoints: event.target.value }))}
                  placeholder={"One bullet per line\nPaste the competitor bullets here"}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="competitor-description">
                  Competitor Description
                </label>
                <Textarea
                  id="competitor-description"
                  className="min-h-[120px]"
                  value={competitorForm.description}
                  onChange={(event) => setCompetitorForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Optional competitor description"
                />
              </div>
              <Button className="rounded-2xl" disabled={submittingCompetitor} type="submit">
                {submittingCompetitor ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving competitor...
                  </>
                ) : (
                  <>
                    <SearchCheck className="h-4 w-4" />
                    Compare competitor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80 bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle>Saved Competitor Comparisons</CardTitle>
            <CardDescription>Use these comparisons to guide the rewrite, not just to collect more data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {competitorsLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Loading competitors...</div>
            ) : competitors.length ? (
              competitors.map((competitor) => (
                <div key={competitor.id} className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fff,#f8fafc)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{competitor.title || "Untitled competitor"}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        {competitor.asin} · {new Date(competitor.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Keyword overlap</div>
                      <div className={`text-2xl font-semibold ${scoreTone(competitor.comparison_json.summary.keywordOverlapRatio)}`}>
                        {competitor.comparison_json.summary.keywordOverlapRatio}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-900">Competitor advantage</div>
                      <div className="mt-2 space-y-2 text-sm text-slate-500">
                        {competitor.comparison_json.summary.competitorAdvantage.length ? (
                          competitor.comparison_json.summary.competitorAdvantage.map((item, index) => (
                            <div key={`${competitor.id}-ca-${index}`}>{item}</div>
                          ))
                        ) : (
                          <div>No strong advantage detected yet.</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-900">Your current advantage</div>
                      <div className="mt-2 space-y-2 text-sm text-slate-500">
                        {competitor.comparison_json.summary.yourAdvantage.length ? (
                          competitor.comparison_json.summary.yourAdvantage.map((item, index) => (
                            <div key={`${competitor.id}-ya-${index}`}>{item}</div>
                          ))
                        ) : (
                          <div>No strong advantage detected yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No competitors saved yet. Add the first one to unlock gap analysis.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-slate-200/80 bg-white/85 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Stage 3 · AI Rewrite</CardTitle>
            <CardDescription>Generate stronger title and bullet options from the audit and competitor context.</CardDescription>
          </div>
          <Button className="rounded-2xl" disabled={generatingRewrite} onClick={handleGenerateRewrite} type="button">
            {generatingRewrite ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating rewrite...
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" />
                Generate rewrite
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {generationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>AI rewrite failed</AlertTitle>
              <AlertDescription>{generationError}</AlertDescription>
            </Alert>
          )}

          {generationsLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Loading saved generations...</div>
          ) : titleGeneration || bulletsGeneration ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-medium text-slate-900">Rewrite summary</div>
                  <div className="text-sm leading-6 text-slate-600">
                    {titleGeneration?.output_json.summary ||
                      bulletsGeneration?.output_json.summary ||
                      "Rewrite generated from the audit context."}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-900">Title options</div>
                  {titleGeneration?.output_json.titleOptions?.length ? (
                    titleGeneration.output_json.titleOptions.map((option, index) => (
                      <div key={`${titleGeneration.id}-title-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Option {index + 1}</div>
                        {option}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No title options saved yet.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-slate-900">Bullet options</div>
                <div className="space-y-4">
                  {bulletsGeneration?.output_json.bulletOptions?.length ? (
                    bulletsGeneration.output_json.bulletOptions.map((optionSet, setIndex) => (
                      <div key={`${bulletsGeneration.id}-bullet-set-${setIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Set {setIndex + 1}</div>
                        <div className="space-y-2">
                          {optionSet.map((bullet, bulletIndex) => (
                            <div key={`${bulletsGeneration.id}-bullet-${setIndex}-${bulletIndex}`} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                              {bullet}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No bullet rewrite sets saved yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              No saved AI rewrites yet. Generate the first one after reviewing the audit and competitors.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
