type Severity = "low" | "medium" | "high";
type ScoreKey = "seo" | "conversion" | "compliance" | "readability";

export type ListingAuditInput = {
  asin?: string;
  marketplace: string;
  locale: string;
  listingUrl?: string;
  productTitle: string;
  bulletPoints: string[];
  productDescription?: string;
  backendKeywords?: string;
  brandName?: string;
  categoryName?: string;
  priceAmount?: number | null;
  currencyCode?: string;
  imageCount?: number | null;
};

export type AuditIssue = {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  affects: ScoreKey[];
};

export type AuditRecommendation = {
  id: string;
  title: string;
  action: string;
  priority: 1 | 2 | 3;
};

export type ListingAuditResult = {
  scores: {
    overall: number;
    seo: number;
    conversion: number;
    compliance: number;
    readability: number;
  };
  summary: {
    titleLength: number;
    bulletCount: number;
    descriptionLength: number;
    backendKeywordCount: number;
  };
  normalized: {
    title: string;
    bullets: string[];
    description: string;
    backendKeywords: string[];
  };
  issues: AuditIssue[];
  recommendations: AuditRecommendation[];
};

function normalizeWhitespace(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function keywordList(value: string | undefined): string[] {
  return normalizeWhitespace(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function wordCount(value: string): number {
  return normalizeWhitespace(value).split(" ").filter(Boolean).length;
}

function uniqueWordsRatio(value: string): number {
  const words = normalizeWhitespace(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

  if (words.length === 0) {
    return 1;
  }

  return new Set(words).size / words.length;
}

function buildIssue(
  id: string,
  title: string,
  detail: string,
  severity: Severity,
  affects: ScoreKey[],
): AuditIssue {
  return { id, title, detail, severity, affects };
}

function buildRecommendation(
  id: string,
  title: string,
  action: string,
  priority: 1 | 2 | 3,
): AuditRecommendation {
  return { id, title, action, priority };
}

export function scoreListingAudit(input: ListingAuditInput): ListingAuditResult {
  const title = normalizeWhitespace(input.productTitle);
  const bullets = input.bulletPoints.map(normalizeWhitespace).filter(Boolean);
  const description = normalizeWhitespace(input.productDescription);
  const backendKeywords = keywordList(input.backendKeywords);
  const issues: AuditIssue[] = [];
  const recommendations: AuditRecommendation[] = [];

  let seo = 100;
  let conversion = 100;
  let compliance = 100;
  let readability = 100;

  if (title.length < 80) {
    seo -= 18;
    conversion -= 8;
    issues.push(
      buildIssue(
        "title-too-short",
        "Title is too short",
        "Short titles usually waste searchable real estate and miss important buying signals.",
        "high",
        ["seo", "conversion"],
      ),
    );
    recommendations.push(
      buildRecommendation(
        "expand-title",
        "Expand the title",
        "Add core keywords, brand, product type, size, quantity, or a key differentiator while keeping it readable.",
        1,
      ),
    );
  }

  if (title.length > 200) {
    seo -= 10;
    compliance -= 20;
    readability -= 10;
    issues.push(
      buildIssue(
        "title-too-long",
        "Title may be too long",
        "Long titles increase policy risk and often become harder to scan on mobile.",
        "high",
        ["compliance", "readability", "seo"],
      ),
    );
  }

  if (!input.brandName || normalizeWhitespace(input.brandName).length < 2) {
    conversion -= 8;
    issues.push(
      buildIssue(
        "missing-brand",
        "Brand is missing",
        "Branded titles and audits perform better when the product identity is explicit.",
        "medium",
        ["conversion"],
      ),
    );
  }

  if (bullets.length < 5) {
    seo -= 12;
    conversion -= 18;
    issues.push(
      buildIssue(
        "not-enough-bullets",
        "Not enough bullet points",
        "Amazon listings usually need five strong bullets to communicate benefits, use cases, and objections.",
        "high",
        ["conversion", "seo"],
      ),
    );
    recommendations.push(
      buildRecommendation(
        "complete-bullets",
        "Add all five bullets",
        "Write five benefit-led bullets covering the main use case, feature proof, trust signal, and differentiation.",
        1,
      ),
    );
  }

  const shortBullets = bullets.filter((bullet) => bullet.length < 80).length;
  if (shortBullets > 0) {
    conversion -= shortBullets * 3;
    readability -= shortBullets * 2;
    issues.push(
      buildIssue(
        "thin-bullets",
        "Some bullets are too thin",
        `${shortBullets} bullet point(s) are too short to communicate value clearly.`,
        "medium",
        ["conversion", "readability"],
      ),
    );
  }

  if (description.length < 300) {
    conversion -= 10;
    seo -= 6;
    issues.push(
      buildIssue(
        "thin-description",
        "Description is underdeveloped",
        "A short description usually leaves buying questions unanswered and limits keyword coverage.",
        "medium",
        ["conversion", "seo"],
      ),
    );
  }

  if (backendKeywords.length < 5) {
    seo -= 12;
    issues.push(
      buildIssue(
        "missing-backend-keywords",
        "Backend keyword coverage is weak",
        "The listing has too few backend keyword entries to capture additional search intent.",
        "medium",
        ["seo"],
      ),
    );
    recommendations.push(
      buildRecommendation(
        "expand-backend-keywords",
        "Expand backend keywords",
        "Add non-repeating search terms, synonyms, long-tail variants, and alternate buyer phrasing.",
        2,
      ),
    );
  }

  const repeatedRatio = uniqueWordsRatio(`${title} ${bullets.join(" ")} ${description}`);
  if (repeatedRatio < 0.55) {
    seo -= 10;
    readability -= 14;
    compliance -= 6;
    issues.push(
      buildIssue(
        "keyword-stuffing-risk",
        "Keyword stuffing risk detected",
        "The text repeats too many words, which lowers readability and can create spammy phrasing.",
        "high",
        ["seo", "readability", "compliance"],
      ),
    );
  }

  const titleDigits = (title.match(/\d/g) || []).length;
  const bulletDigits = (bullets.join(" ").match(/\d/g) || []).length;
  const numericsCount = titleDigits + bulletDigits;
  if (numericsCount === 0) {
    conversion -= 6;
    recommendations.push(
      buildRecommendation(
        "add-specifics",
        "Add specific proof points",
        "Use measurable facts such as size, quantity, material, dimensions, compatibility, or performance claims.",
        2,
      ),
    );
  }

  if ((input.imageCount ?? 0) < 5) {
    conversion -= 8;
    issues.push(
      buildIssue(
        "low-image-count",
        "Image set looks incomplete",
        "Listings with a thin image set usually convert worse because shoppers cannot validate the product fast enough.",
        "medium",
        ["conversion"],
      ),
    );
  }

  const titleWordCount = wordCount(title);
  if (titleWordCount > 0 && titleWordCount < 10) {
    seo -= 8;
    issues.push(
      buildIssue(
        "title-lacks-coverage",
        "Title lacks keyword coverage",
        "The title does not appear to cover enough high-value product descriptors.",
        "medium",
        ["seo"],
      ),
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      buildRecommendation(
        "iterate-with-competitors",
        "Benchmark against competitors",
        "Compare your listing against 3-5 strong ASINs to identify missed value props and keyword gaps.",
        3,
      ),
    );
  }

  seo = clampScore(seo);
  conversion = clampScore(conversion);
  compliance = clampScore(compliance);
  readability = clampScore(readability);

  const overall = clampScore((seo + conversion + compliance + readability) / 4);

  return {
    scores: {
      overall,
      seo,
      conversion,
      compliance,
      readability,
    },
    summary: {
      titleLength: title.length,
      bulletCount: bullets.length,
      descriptionLength: description.length,
      backendKeywordCount: backendKeywords.length,
    },
    normalized: {
      title,
      bullets,
      description,
      backendKeywords,
    },
    issues,
    recommendations: recommendations.sort((a, b) => a.priority - b.priority),
  };
}
