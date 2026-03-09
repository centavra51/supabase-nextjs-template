"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, SearchCheck, Sparkles, WandSparkles } from "lucide-react";

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
        const data = (await response.json()) as { competitors?: CompetitorItem[] };
        if (response.ok) {
          setCompetitors((data.competitors || []).map((item) => normalizeCompetitor(item)));
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
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to save competitor.");
      }

      if (data.competitor) {
        const normalizedCompetitor = normalizeCompetitor(data.competitor as CompetitorItem);
        setCompetitors((prev) => [normalizedCompetitor, ...prev]);
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

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="space-y-6 p-6">
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link className="inline-flex items-center text-sm font-medium text-primary hover:underline" href="/app/audit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to audits
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{audit.product_title || "Untitled audit"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {audit.marketplace}
            {audit.asin ? ` • ${audit.asin}` : ""} • {new Date(audit.created_at).toLocaleString()}
          </p>
        </div>
        <div className={`text-4xl font-semibold ${scoreTone(audit.overall_score ?? 0)}`}>
          {audit.overall_score ?? "—"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["SEO", audit.seo_score],
          ["Conversion", audit.conversion_score],
          ["Compliance", audit.compliance_score],
          ["Readability", audit.readability_score],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className={scoreTone(Number(value ?? 0))}>{value ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {usage && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Plan</CardDescription>
              <CardTitle className="capitalize">{usage.plan}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Audit Credits Left</CardDescription>
              <CardTitle>
                {usage.auditsRemaining} / {usage.auditCreditsMonthly}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>AI Credits Left</CardDescription>
              <CardTitle>
                {usage.aiRemaining} / {usage.aiCreditsMonthly}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Listing Snapshot</CardTitle>
            <CardDescription>The source text used for this audit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium">Title</div>
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">{audit.product_title || "—"}</div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Bullets</div>
              <div className="space-y-2">
                {audit.bullet_points.length ? (
                  audit.bullet_points.map((bullet, index) => (
                    <div key={`${audit.id}-bullet-${index}`} className="rounded-lg border bg-slate-50 p-4 text-sm">
                      {bullet}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No bullets saved.</div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Description</div>
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                {audit.product_description || "No description provided."}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Backend Keywords</div>
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                {audit.backend_keywords || "No backend keywords provided."}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issues</CardTitle>
              <CardDescription>What the current listing draft gets wrong.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {audit.issues_json?.length ? (
                audit.issues_json.map((issue) => (
                  <div key={issue.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{issue.title}</div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs uppercase tracking-wide text-slate-700">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No saved issues.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Priority fixes before you move into AI rewrite.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {audit.recommendations_json?.length ? (
                audit.recommendations_json.map((recommendation) => (
                  <div key={recommendation.id} className="rounded-lg border p-4">
                    <div className="font-medium">{recommendation.title}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{recommendation.action}</p>
                    <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                      Priority {recommendation.priority}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No saved recommendations.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Competitor Compare</CardTitle>
            <CardDescription>
              Add a competitor manually and generate keyword and messaging gap analysis against this audit.
            </CardDescription>
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
              <Button disabled={submittingCompetitor} type="submit">
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

        <Card>
          <CardHeader>
            <CardTitle>Saved Competitor Comparisons</CardTitle>
            <CardDescription>Gap analysis generated from saved competitor entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {competitorsLoading ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Loading competitors...</div>
            ) : competitors.length ? (
              competitors.map((competitor) => (
                <div key={competitor.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{competitor.title || "Untitled competitor"}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {competitor.asin} • {new Date(competitor.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Keyword overlap</div>
                      <div className={`text-2xl font-semibold ${scoreTone(competitor.comparison_json.summary.keywordOverlapRatio)}`}>
                        {competitor.comparison_json.summary.keywordOverlapRatio}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-4">
                      <div className="text-sm font-medium">Competitor advantage</div>
                      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {competitor.comparison_json.summary.competitorAdvantage.length ? (
                          competitor.comparison_json.summary.competitorAdvantage.map((item, index) => (
                            <div key={`${competitor.id}-ca-${index}`}>{item}</div>
                          ))
                        ) : (
                          <div>No strong advantage detected yet.</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4">
                      <div className="text-sm font-medium">Your current advantage</div>
                      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
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

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div>
                      <div className="mb-2 text-sm font-medium">Overlap keywords</div>
                      <div className="flex flex-wrap gap-2">
                        {competitor.comparison_json.overlapKeywords.length ? (
                          competitor.comparison_json.overlapKeywords.map((keyword) => (
                            <span key={`${competitor.id}-ok-${keyword}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No overlap found.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium">Competitor-only keywords</div>
                      <div className="flex flex-wrap gap-2">
                        {competitor.comparison_json.competitorOnlyKeywords.length ? (
                          competitor.comparison_json.competitorOnlyKeywords.map((keyword) => (
                            <span key={`${competitor.id}-ck-${keyword}`} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No gaps found.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium">Missing backend coverage</div>
                      <div className="flex flex-wrap gap-2">
                        {competitor.comparison_json.missingBackendKeywordCoverage.length ? (
                          competitor.comparison_json.missingBackendKeywordCoverage.map((keyword) => (
                            <span key={`${competitor.id}-bk-${keyword}`} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Backend coverage looks healthy.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Structural deltas
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
                      <div>Title length delta: {competitor.comparison_json.structuralDelta.titleLengthDelta}</div>
                      <div>Bullet count delta: {competitor.comparison_json.structuralDelta.bulletCountDelta}</div>
                      <div>Description delta: {competitor.comparison_json.structuralDelta.descriptionLengthDelta}</div>
                    </div>
                  </div>

                  {competitor.comparison_json.competitorClaims.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 text-sm font-medium">Notable competitor claims</div>
                      <div className="space-y-2">
                        {competitor.comparison_json.competitorClaims.map((claim, index) => (
                          <div key={`${competitor.id}-claim-${index}`} className="rounded-lg border bg-slate-50 p-3 text-sm">
                            {claim}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No competitors saved yet. Add the first one to unlock gap analysis.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>AI Rewrite</CardTitle>
            <CardDescription>
              Generate improved title and bullet options using the audit issues and saved competitor gaps.
            </CardDescription>
          </div>
          <Button disabled={generatingRewrite} onClick={handleGenerateRewrite} type="button">
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
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Loading saved generations...</div>
          ) : titleGeneration || bulletsGeneration ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">Rewrite summary</div>
                  <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
                    {titleGeneration?.output_json.summary ||
                      bulletsGeneration?.output_json.summary ||
                      "Rewrite generated from the audit context."}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Title options</div>
                  <div className="space-y-3">
                    {titleGeneration?.output_json.titleOptions?.length ? (
                      titleGeneration.output_json.titleOptions.map((option, index) => (
                        <div key={`${titleGeneration.id}-title-${index}`} className="rounded-lg border p-4 text-sm">
                          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Option {index + 1}</div>
                          {option}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No title options saved yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Bullet options</div>
                <div className="space-y-4">
                  {bulletsGeneration?.output_json.bulletOptions?.length ? (
                    bulletsGeneration.output_json.bulletOptions.map((optionSet, setIndex) => (
                      <div key={`${bulletsGeneration.id}-bullet-set-${setIndex}`} className="rounded-lg border p-4">
                        <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Set {setIndex + 1}</div>
                        <div className="space-y-2">
                          {optionSet.map((bullet, bulletIndex) => (
                            <div key={`${bulletsGeneration.id}-bullet-${setIndex}-${bulletIndex}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                              {bullet}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No bullet rewrite sets saved yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No saved AI rewrites yet. Generate the first one after reviewing the audit and competitors.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
