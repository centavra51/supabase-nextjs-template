"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, SearchCheck, Sparkles, Target, WandSparkles } from "lucide-react";

import { useGlobal } from "@/lib/context/GlobalContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RecentAudit = {
  id: string;
  marketplace: string;
  asin: string | null;
  product_title: string | null;
  overall_score: number | null;
  created_at: string;
};

type UsageSnapshot = {
  plan: string;
  auditCreditsMonthly: number;
  auditsRemaining: number;
  aiCreditsMonthly: number;
  aiRemaining: number;
  competitorCreditsMonthly: number;
  competitorsRemaining: number;
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

export default function DashboardContent() {
  const { loading, user } = useGlobal();
  const [recentAudits, setRecentAudits] = useState<RecentAudit[]>([]);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        const [auditResponse, usageResponse] = await Promise.all([
          fetch("/api/audit?limit=4", { method: "GET", cache: "no-store" }),
          fetch("/api/usage", { method: "GET", cache: "no-store" }),
        ]);

        if (auditResponse.ok) {
          const auditData = (await auditResponse.json()) as { audits?: RecentAudit[] };
          setRecentAudits(auditData.audits || []);
        }

        if (usageResponse.ok) {
          const usageData = (await usageResponse.json()) as { usage?: UsageSnapshot };
          setUsage(usageData.usage || null);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      }
    }

    loadOverview();
  }, []);

  const daysSinceRegistration = user?.registered_at
    ? Math.ceil(Math.abs(Date.now() - user.registered_at.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,#fcd34d,transparent_30%),linear-gradient(135deg,#0f172a_0%,#1e293b_60%,#334155_100%)] text-white shadow-xl shadow-slate-900/10">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Amazon Listing Audit</div>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
              One workspace for audit, competitor gap analysis, and AI rewrite.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
              Stop digging through a generic SaaS template. Your product starts here: review a listing, find the biggest
              conversion and SEO problems, then generate stronger copy from the same flow.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/app/audit"
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
              >
                <SearchCheck className="h-4 w-4" />
                Start New Audit
              </Link>
              <Link
                href={recentAudits[0] ? `/app/audit/${recentAudits[0].id}` : "/app/audit"}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Open Latest Audit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: "Stage 1",
                  text: "Run the listing audit and find the highest-impact issues first.",
                },
                {
                  icon: Sparkles,
                  title: "Stage 2",
                  text: "Add competitors to expose keyword and claim gaps.",
                },
                {
                  icon: WandSparkles,
                  title: "Stage 3",
                  text: "Generate stronger title and bullet options from the audit context.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/8 p-4">
                  <item.icon className="h-5 w-5 text-amber-300" />
                  <div className="mt-3 text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-300">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Operator</div>
            <div className="mt-3 text-2xl font-semibold">{user?.email?.split("@")[0] || "Account"}</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <CalendarDays className="h-4 w-4" />
              Member for {daysSinceRegistration} days
            </div>

            {usage ? (
              <div className="mt-6 space-y-3">
                {[
                  ["Audit credits", `${usage.auditsRemaining} / ${usage.auditCreditsMonthly}`],
                  ["AI rewrite credits", `${usage.aiRemaining} / ${usage.aiCreditsMonthly}`],
                  ["Competitor credits", `${usage.competitorsRemaining} / ${usage.competitorCreditsMonthly}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-300">{label}</div>
                    <div className="mt-1 text-xl font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-6 text-sm text-slate-300">
                Usage data will appear after the first load.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="border-slate-200/80 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle>What To Do Next</CardTitle>
            <CardDescription>Use the product in a straight line, not like a template dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              {
                href: "/app/audit",
                title: "Run an audit",
                text: "Paste title, bullets, description, and backend keywords.",
              },
              {
                href: recentAudits[0] ? `/app/audit/${recentAudits[0].id}` : "/app/audit",
                title: "Review findings",
                text: "Open issues, score breakdown, and priority recommendations.",
              },
              {
                href: recentAudits[0] ? `/app/audit/${recentAudits[0].id}` : "/app/audit",
                title: "Generate rewrite",
                text: "Add competitors, then create new title and bullet options.",
              },
            ].map((item, index) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#fff, #f8fafc)] p-5 transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Step 0{index + 1}</div>
                <div className="mt-3 text-lg font-semibold text-slate-900">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{item.text}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle>Product Focus</CardTitle>
            <CardDescription>The main product path is the audit workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              `Overview` explains the workflow and shows your latest work.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              `Audit Workspace` is where the actual product lives.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              `Storage Demo` stays available, but it is clearly marked as legacy template material.
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200/80 bg-white/85 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
          <CardDescription>Continue from the latest listing review instead of starting from scratch.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAudits.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {recentAudits.map((audit) => (
                <Link
                  key={audit.id}
                  href={`/app/audit/${audit.id}`}
                  className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fff,#f8fafc)] p-5 transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{audit.product_title || "Untitled audit"}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {audit.marketplace}
                        {audit.asin ? ` · ${audit.asin}` : ""}
                      </div>
                    </div>
                    <div className={`text-3xl font-semibold ${scoreTone(audit.overall_score ?? 0)}`}>
                      {audit.overall_score ?? "—"}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-500">{new Date(audit.created_at).toLocaleString()}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">
              No audits yet. Start with the `Run an audit` step above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
