"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, SearchCheck, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AuditScores = {
  overall: number;
  seo: number;
  conversion: number;
  compliance: number;
  readability: number;
};

type AuditIssue = {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  affects: string[];
};

type AuditRecommendation = {
  id: string;
  title: string;
  action: string;
  priority: 1 | 2 | 3;
};

type AuditResponse = {
  audit: AuditHistoryItem;
  result: {
    scores: AuditScores;
    issues: AuditIssue[];
    recommendations: AuditRecommendation[];
    summary: {
      titleLength: number;
      bulletCount: number;
      descriptionLength: number;
      backendKeywordCount: number;
    };
  };
  usage?: UsageSnapshot;
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

type AuditHistoryItem = {
  id: string;
  asin: string | null;
  marketplace: string;
  product_title: string | null;
  overall_score: number | null;
  seo_score: number | null;
  conversion_score: number | null;
  compliance_score: number | null;
  readability_score: number | null;
  created_at: string;
  status: string;
};

type FormState = {
  asin: string;
  marketplace: string;
  locale: string;
  listingUrl: string;
  productTitle: string;
  bulletPoints: string;
  productDescription: string;
  backendKeywords: string;
  brandName: string;
  categoryName: string;
  priceAmount: string;
  currencyCode: string;
  imageCount: string;
};

const initialForm: FormState = {
  asin: "",
  marketplace: "amazon.com",
  locale: "en",
  listingUrl: "",
  productTitle: "",
  bulletPoints: "",
  productDescription: "",
  backendKeywords: "",
  brandName: "",
  categoryName: "",
  priceAmount: "",
  currencyCode: "USD",
  imageCount: "",
};

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

export default function AuditPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AuditResponse | null>(null);
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/audit?limit=8", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json()) as { audits?: AuditHistoryItem[]; usage?: UsageSnapshot; error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Failed to load audit history.");
        }
        setHistory(data.audits || []);
        setUsage(data.usage || null);
      } catch (historyError) {
        console.error(historyError);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          bulletPoints: form.bulletPoints,
          priceAmount: form.priceAmount ? Number(form.priceAmount) : null,
          imageCount: form.imageCount ? Number(form.imageCount) : null,
        }),
      });

      const data = (await res.json()) as AuditResponse & { error?: string; details?: string };

      if (!res.ok) {
        if (data.usage) {
          setUsage(data.usage);
        }
        throw new Error(data.details || data.error || "Audit failed.");
      }

      setResponse(data);
      if (data.usage) {
        setUsage(data.usage);
      }
      setHistory((prev) => [data.audit, ...prev].slice(0, 8));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Audit failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scores = response?.result.scores;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Amazon Listing Audit</h1>
          <p className="text-sm text-muted-foreground">
            Paste a listing draft and get an instant SEO, conversion, compliance, and readability review.
          </p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
          MVP mode: rule-based audit with database persistence
        </div>
      </div>

      {usage && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Current Plan</CardDescription>
              <CardTitle className="capitalize">{usage.plan}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Audit Credits</CardDescription>
              <CardTitle>
                {usage.auditsRemaining} / {usage.auditCreditsMonthly}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>AI Credits</CardDescription>
              <CardTitle>
                {usage.aiRemaining} / {usage.aiCreditsMonthly}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Audit failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Listing Input</CardTitle>
            <CardDescription>
              Enter the core listing fields. Use one bullet point per line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="asin">
                    ASIN
                  </label>
                  <Input
                    id="asin"
                    value={form.asin}
                    onChange={(event) => setForm((prev) => ({ ...prev, asin: event.target.value }))}
                    placeholder="B0XXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="listingUrl">
                    Listing URL
                  </label>
                  <Input
                    id="listingUrl"
                    value={form.listingUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, listingUrl: event.target.value }))}
                    placeholder="https://amazon.com/dp/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="marketplace">
                    Marketplace
                  </label>
                  <Input
                    id="marketplace"
                    value={form.marketplace}
                    onChange={(event) => setForm((prev) => ({ ...prev, marketplace: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="locale">
                    Locale
                  </label>
                  <Input
                    id="locale"
                    value={form.locale}
                    onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="brandName">
                    Brand
                  </label>
                  <Input
                    id="brandName"
                    value={form.brandName}
                    onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="categoryName">
                    Category
                  </label>
                  <Input
                    id="categoryName"
                    value={form.categoryName}
                    onChange={(event) => setForm((prev) => ({ ...prev, categoryName: event.target.value }))}
                    placeholder="Home & Kitchen"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="priceAmount">
                    Price
                  </label>
                  <Input
                    id="priceAmount"
                    type="number"
                    step="0.01"
                    value={form.priceAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
                    placeholder="29.99"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="currencyCode">
                    Currency
                  </label>
                  <Input
                    id="currencyCode"
                    value={form.currencyCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, currencyCode: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="productTitle">
                  Product Title
                </label>
                <Textarea
                  id="productTitle"
                  className="min-h-[100px]"
                  value={form.productTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, productTitle: event.target.value }))}
                  placeholder="Brand + product type + main keyword + differentiator + size / quantity"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="bulletPoints">
                  Bullet Points
                </label>
                <Textarea
                  id="bulletPoints"
                  className="min-h-[180px]"
                  value={form.bulletPoints}
                  onChange={(event) => setForm((prev) => ({ ...prev, bulletPoints: event.target.value }))}
                  placeholder={"One bullet per line\nProblem solved\nFeature proof\nDifferentiator\nTrust signal\nUse case"}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="productDescription">
                    Product Description
                  </label>
                  <Textarea
                    id="productDescription"
                    className="min-h-[180px]"
                    value={form.productDescription}
                    onChange={(event) => setForm((prev) => ({ ...prev, productDescription: event.target.value }))}
                    placeholder="Detailed description, benefits, use cases, objections, care instructions..."
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="backendKeywords">
                      Backend Keywords
                    </label>
                    <Textarea
                      id="backendKeywords"
                      className="min-h-[120px]"
                      value={form.backendKeywords}
                      onChange={(event) => setForm((prev) => ({ ...prev, backendKeywords: event.target.value }))}
                      placeholder="comma, separated, keywords"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="imageCount">
                      Image Count
                    </label>
                    <Input
                      id="imageCount"
                      type="number"
                      value={form.imageCount}
                      onChange={(event) => setForm((prev) => ({ ...prev, imageCount: event.target.value }))}
                      placeholder="7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running audit...
                    </>
                  ) : (
                    <>
                      <SearchCheck className="h-4 w-4" />
                      Run Audit
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(initialForm);
                    setResponse(null);
                    setError(null);
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score Snapshot</CardTitle>
              <CardDescription>
                The first audit is rule-based. AI rewrite comes after this foundation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scores ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(scores).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-slate-50 p-4">
                      <div className="text-sm capitalize text-muted-foreground">{key}</div>
                      <div className={`mt-2 text-3xl font-semibold ${scoreTone(value)}`}>{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Submit a listing to see the score breakdown.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issues Found</CardTitle>
              <CardDescription>Prioritized problems detected in the current listing draft.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {response?.result.issues.length ? (
                response.result.issues.map((issue) => (
                  <div key={issue.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium">{issue.title}</div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs uppercase tracking-wide text-slate-700">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No audit yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Next Actions</CardTitle>
              <CardDescription>Use these actions to prepare the upcoming AI rewrite step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {response?.result.recommendations.length ? (
                response.result.recommendations.map((recommendation) => (
                  <div key={recommendation.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {recommendation.title}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{recommendation.action}</p>
                    <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                      Priority {recommendation.priority}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Recommendations will appear after the first successful audit.
                </div>
              )}
            </CardContent>
          </Card>

          {response && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Audit saved</AlertTitle>
              <AlertDescription>
                Audit <span className="font-mono">{response.audit.id}</span> was stored in Supabase.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Audits</CardTitle>
              <CardDescription>Your last saved listing reviews.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyLoading ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Loading history...
                </div>
              ) : history.length ? (
                history.map((audit) => (
                  <Link key={audit.id} href={`/app/audit/${audit.id}`} className="block rounded-lg border p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{audit.product_title || "Untitled audit"}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {audit.marketplace} {audit.asin ? `• ${audit.asin}` : ""}
                        </div>
                      </div>
                      <div className={`text-2xl font-semibold ${scoreTone(audit.overall_score ?? 0)}`}>
                        {audit.overall_score ?? "—"}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>SEO {audit.seo_score ?? "—"}</div>
                      <div>Conv {audit.conversion_score ?? "—"}</div>
                      <div>Comp {audit.compliance_score ?? "—"}</div>
                      <div>Read {audit.readability_score ?? "—"}</div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {new Date(audit.created_at).toLocaleString()}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No saved audits yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
