import type { Database } from "@/lib/types";

type SupabaseClient = {
  // Supabase client generics differ between server/browser wrappers; the helper only relies on from().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type UsageRow = Database["public"]["Tables"]["usage_limits"]["Row"];

export type UsageSnapshot = {
  plan: UsageRow["plan"];
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

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function asDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toSnapshot(row: UsageRow): UsageSnapshot {
  return {
    plan: row.plan,
    auditCreditsMonthly: row.audit_credits_monthly,
    auditsUsed: row.audits_used,
    auditsRemaining: Math.max(0, row.audit_credits_monthly - row.audits_used),
    aiCreditsMonthly: row.ai_credits_monthly,
    aiUsed: row.ai_used,
    aiRemaining: Math.max(0, row.ai_credits_monthly - row.ai_used),
    competitorCreditsMonthly: row.competitor_credits_monthly,
    competitorsUsed: row.competitors_used,
    competitorsRemaining: Math.max(0, row.competitor_credits_monthly - row.competitors_used),
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

async function createUsageRow(client: SupabaseClient, userId: string) {
  const now = new Date();
  const { data, error } = await client
    .from("usage_limits")
    .insert({
      user_id: userId,
      period_start: asDateString(now),
      period_end: asDateString(addDays(now, 30)),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create usage row.");
  }

  return data as UsageRow;
}

async function maybeResetPeriod(client: SupabaseClient, row: UsageRow) {
  const today = new Date();
  const periodEnd = new Date(`${row.period_end}T00:00:00.000Z`);

  if (periodEnd >= today) {
    return row;
  }

  const nextRow: Partial<UsageRow> = {
    audits_used: 0,
    ai_used: 0,
    competitors_used: 0,
    period_start: asDateString(today),
    period_end: asDateString(addDays(today, 30)),
  };

  const { error } = await client.from("usage_limits").update(nextRow).eq("user_id", row.user_id);
  if (error) {
    throw new Error(error.message);
  }

  return {
    ...row,
    ...nextRow,
  } as UsageRow;
}

export async function ensureUsageRow(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("usage_limits").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return createUsageRow(client, userId);
  }

  return maybeResetPeriod(client, data as UsageRow);
}

export async function getUsageSnapshot(client: SupabaseClient, userId: string) {
  const row = await ensureUsageRow(client, userId);
  return toSnapshot(row);
}

export async function consumeAuditCredit(client: SupabaseClient, userId: string) {
  const row = await ensureUsageRow(client, userId);
  if (row.audits_used >= row.audit_credits_monthly) {
    return {
      ok: false as const,
      usage: toSnapshot(row),
      message: "Monthly audit limit reached for your current plan.",
    };
  }

  const nextUsed = row.audits_used + 1;
  const { error } = await client.from("usage_limits").update({ audits_used: nextUsed }).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true as const,
    usage: toSnapshot({
      ...row,
      audits_used: nextUsed,
    }),
  };
}

export async function consumeAiCredit(client: SupabaseClient, userId: string) {
  const row = await ensureUsageRow(client, userId);
  if (row.ai_used >= row.ai_credits_monthly) {
    return {
      ok: false as const,
      usage: toSnapshot(row),
      message: "Monthly AI rewrite limit reached for your current plan.",
    };
  }

  const nextUsed = row.ai_used + 1;
  const { error } = await client.from("usage_limits").update({ ai_used: nextUsed }).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true as const,
    usage: toSnapshot({
      ...row,
      ai_used: nextUsed,
    }),
  };
}

export async function consumeCompetitorCredit(client: SupabaseClient, userId: string) {
  const row = await ensureUsageRow(client, userId);
  if (row.competitors_used >= row.competitor_credits_monthly) {
    return {
      ok: false as const,
      usage: toSnapshot(row),
      message: "Monthly competitor analysis limit reached for your current plan.",
    };
  }

  const nextUsed = row.competitors_used + 1;
  const { error } = await client.from("usage_limits").update({ competitors_used: nextUsed }).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true as const,
    usage: toSnapshot({
      ...row,
      competitors_used: nextUsed,
    }),
  };
}

export async function canUseAudit(client: SupabaseClient, userId: string) {
  const usage = await getUsageSnapshot(client, userId);
  return {
    ok: usage.auditsRemaining > 0,
    usage,
    message: usage.auditsRemaining > 0 ? null : "Monthly audit limit reached for your current plan.",
  };
}

export async function canUseAi(client: SupabaseClient, userId: string) {
  const usage = await getUsageSnapshot(client, userId);
  return {
    ok: usage.aiRemaining > 0,
    usage,
    message: usage.aiRemaining > 0 ? null : "Monthly AI rewrite limit reached for your current plan.",
  };
}

export async function canUseCompetitor(client: SupabaseClient, userId: string) {
  const usage = await getUsageSnapshot(client, userId);
  return {
    ok: usage.competitorsRemaining > 0,
    usage,
    message:
      usage.competitorsRemaining > 0 ? null : "Monthly competitor analysis limit reached for your current plan.",
  };
}
