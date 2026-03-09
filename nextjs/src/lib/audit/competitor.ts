function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length >= 3);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function topKeywords(text: string, limit = 20): string[] {
  const counts = new Map<string, number>();

  for (const word of tokenize(text)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function longPhrases(values: string[]): string[] {
  return unique(
    values
      .map((value) => normalizeText(value))
      .filter((value) => value.length >= 40)
      .map((value) => value.slice(0, 90)),
  ).slice(0, 5);
}

export type CompetitorComparisonInput = {
  base: {
    title: string;
    bullets: string[];
    description?: string | null;
    backendKeywords?: string | null;
  };
  competitor: {
    asin: string;
    title: string;
    bullets: string[];
    description?: string | null;
  };
};

export type CompetitorComparisonResult = {
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

export function compareCompetitor(input: CompetitorComparisonInput): CompetitorComparisonResult {
  const baseTitle = normalizeText(input.base.title);
  const baseBullets = input.base.bullets.map(normalizeText).filter(Boolean);
  const baseDescription = normalizeText(input.base.description);
  const baseKeywords = unique([
    ...topKeywords([baseTitle, ...baseBullets, baseDescription].join(" "), 25),
    ...tokenize(input.base.backendKeywords ?? ""),
  ]);

  const competitorTitle = normalizeText(input.competitor.title);
  const competitorBullets = input.competitor.bullets.map(normalizeText).filter(Boolean);
  const competitorDescription = normalizeText(input.competitor.description);
  const competitorKeywords = unique(
    topKeywords([competitorTitle, ...competitorBullets, competitorDescription].join(" "), 25),
  );

  const baseSet = new Set(baseKeywords);
  const overlapKeywords = competitorKeywords.filter((word) => baseSet.has(word)).slice(0, 12);
  const competitorOnlyKeywords = competitorKeywords.filter((word) => !baseSet.has(word)).slice(0, 12);
  const backendSet = new Set(tokenize(input.base.backendKeywords ?? ""));
  const missingBackendKeywordCoverage = competitorOnlyKeywords.filter((word) => !backendSet.has(word)).slice(0, 8);

  const overlapRatio = competitorKeywords.length
    ? Math.round((overlapKeywords.length / competitorKeywords.length) * 100)
    : 0;

  const competitorClaims = longPhrases(competitorBullets);

  const competitorAdvantage: string[] = [];
  const yourAdvantage: string[] = [];

  if (competitorBullets.length > baseBullets.length) {
    competitorAdvantage.push("Competitor covers more bullet points.");
  } else if (baseBullets.length > competitorBullets.length) {
    yourAdvantage.push("Your listing covers more bullet points.");
  }

  if (competitorDescription.length > baseDescription.length + 120) {
    competitorAdvantage.push("Competitor description is materially more detailed.");
  } else if (baseDescription.length > competitorDescription.length + 120) {
    yourAdvantage.push("Your description is materially more detailed.");
  }

  if (competitorOnlyKeywords.length >= 5) {
    competitorAdvantage.push("Competitor introduces keyword themes you do not cover yet.");
  }

  if (overlapRatio >= 60) {
    yourAdvantage.push("Core keyword coverage is already competitive.");
  }

  return {
    overlapKeywords,
    competitorOnlyKeywords,
    missingBackendKeywordCoverage,
    competitorClaims,
    structuralDelta: {
      titleLengthDelta: competitorTitle.length - baseTitle.length,
      bulletCountDelta: competitorBullets.length - baseBullets.length,
      descriptionLengthDelta: competitorDescription.length - baseDescription.length,
    },
    summary: {
      keywordOverlapRatio: overlapRatio,
      competitorAdvantage,
      yourAdvantage,
    },
  };
}
