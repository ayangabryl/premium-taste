export type ReferenceTags = {
  style: string[];
  interaction: string[];
};

export type CreativeReference = {
  id: string;
  name: string;
  url: string;
  screenshot?: string;
  tags: ReferenceTags;
  concept: string;
  typography: string;
  layoutPattern?: string;
  fonts?: string[];
  techniques?: string[];
  assetRequirements?: string[];
  stealList?: string[];
  avoidList?: string[];
  motion: string;
  interaction: string;
  premiumBecause: string[];
  notOneShot: string;
};

export type CreativeTechnique = {
  id: string;
  name: string;
  applyTo: string[];
  description: string;
  stealList: string[];
  assetHints: string[];
  motionHints: string[];
};

export type VerifyProfile = "404" | "hero" | "creative" | "editorial";

export type TasteFontPolicy = "custom-display" | "system-ok" | "mixed";

export type CreativeTaste = {
  id: string;
  label: string;
  tagline: string;
  typographyDirection: string;
  fontPolicy: TasteFontPolicy;
  motionRequired: boolean;
  gsapRequired: boolean;
  interactionDefaults: string[];
  techniqueIds: string[];
  verifyProfile: VerifyProfile;
  juryWeights: Record<
    "interaction" | "typography" | "colorMaterial" | "motion" | "layout" | "concept",
    number
  >;
  goalHint: string;
  stealList: string[];
  antiPatterns: string[];
};

export type PageTypeProfile = {
  id: string;
  label: string;
  goal: string;
  conceptQuestions: string[];
  requiredElements: string[];
  layoutPatterns: string[];
  techniqueIds: string[];
  interactionDefaults: string[];
  antiPatterns: string[];
  verifyProfile: VerifyProfile;
  defaultTaste?: string;
};

export type BriefMode = "reference" | "creative";

export type BriefPhase = {
  id: "concept" | "layout" | "assets" | "motion" | "interaction" | "polish";
  title: string;
  agentInstructions: string[];
  doneWhen: string[];
  doNot: string[];
};

export type GsapSpec = {
  required: boolean;
  plugins: string[];
  timelineNotes: string[];
  reducedMotionFallback: string;
  performanceRules: string[];
};

export type CraftPrincipleBrief = {
  id: string;
  name: string;
  question: string;
};

export type DiscoveryQuestionBrief = {
  id: string;
  prompt: string;
  blocksConceptUntilAnswered?: boolean;
};

export type AssetPlan = {
  pageType: string;
  productDescription: string;
  strategy: string;
  icons: {
    id: string;
    label: string;
    use: string;
  }[];
  lottie: { query: string; searchUrl: string; embedNote: string }[];
  images: { provider: string; tags: string[]; searchUrl: string; license: string }[];
  productionImages: {
    id: string;
    role: string;
    aspect: string;
    pageUrl: string;
    cdnUrl: string;
    alt: string;
    photographer: string;
    width: number;
    verified?: boolean;
  }[];
  instructions: string[];
};

export type CreativeBrief = {
  version: "0.6.1";
  generatedAt: string;
  mode: BriefMode;
  taste: string;
  tasteProfile?: CreativeTaste;
  directionReason?: string;
  pageType: string;
  pageTypeProfile?: PageTypeProfile;
  goal: string;
  references: CreativeReference[];
  techniques: CreativeTechnique[];
  craftPrinciples: CraftPrincipleBrief[];
  discoveryQuestions: DiscoveryQuestionBrief[];
  fitConstraints: string[];
  originalityTest: string;
  avoidSimilarTo: string[];
  concept: string;
  typographyDirection: string;
  typographyGuidance?: import("./typography").TypographyGuidance;
  designMd?: string;
  motionSpec: GsapSpec;
  interactionRequirements: string[];
  phases: BriefPhase[];
  rubricDimensions: RubricDimension[];
  antiPatterns: string[];
  qualityGate: string;
  referenceStudy: string[];
  assetPlan?: AssetPlan;
  copyVoiceRules?: string[];
  colorGuidance?: ColorGuidanceBrief;
  productEnriched?: boolean;
  enrichedProductDescription?: string;
  /** Resolved product string — source of truth for verify/jury when brief.json exists */
  productDescription?: string;
  redesign?: RedesignWorkflowBrief;
  microInteractions?: {
    principles: string[];
    mustHave: string[];
    antiPatterns: string[];
    libraries?: Record<string, string>;
    proactiveSuggestions: string[];
  };
};

export type RubricDimension = {
  id: string;
  title: string;
  weight: number;
  criteria: string[];
};

export type RubricScore = {
  dimensionId: string;
  score: number;
  max: number;
  notes: string;
};

export type MotionVerifyResult = {
  gsapPresent: boolean;
  animatedElements: number;
  entranceSequenced: boolean;
  prefersReducedMotionHandled: boolean;
  reducedMotionSimulated: boolean;
  evidence: string[];
};

export type InteractionVerifyResult = {
  interactiveControls: number;
  hoverTargets: number;
  pointerCustomized: boolean;
  pointerAffectsVisual: boolean;
  evidence: string[];
};

export type VisualVerifyResult = {
  displayTypeScale: boolean;
  customTypography: boolean;
  customAssets: boolean;
  editorialLayout: boolean;
  score: number;
  maxScore: number;
  evidence: string[];
};

export type SlopVerifyResult = {
  clean: boolean;
  flags: number;
  evidence: string[];
};

export type ColorGuidanceBrief = {
  label: string;
  palette: string;
  principles: string[];
  do: string[];
  avoid: string[];
  semanticTokenCss: string;
  agentInstructions: string[];
};

export type ColorVerifyResult = {
  semanticTokens: boolean;
  mutedHierarchy: boolean;
  contrastOk: boolean;
  containedMaterial: boolean;
  score: number;
  maxScore: number;
  evidence: string[];
};

export type RedesignWorkflowBrief = {
  detected: boolean;
  locateTarget: string[];
  photoHandling: string[];
  preserve: string[];
  upgrade: string[];
  documentSections: string[];
  documentPath: string;
};

export type VerifyReport = {
  version: "0.4.0";
  url: string;
  briefPath: string | null;
  verifyProfile: string;
  taste: string;
  motion: MotionVerifyResult;
  interaction: InteractionVerifyResult;
  visual: VisualVerifyResult;
  slop: SlopVerifyResult;
  color: ColorVerifyResult;
  rubric: {
    dimensions: RubricDimension[];
    agentChecklist: string[];
    minimumCreativeScore: number;
  };
  passed: boolean;
  agentNextSteps: string[];
};

export type JuryDimensionScore = {
  id: string;
  title: string;
  weight: number;
  score: number;
  max: number;
  weighted: number;
  notes: string[];
};

export type JurySolidInteraction = {
  scrubPresent: boolean;
  dragChangesValue: boolean;
  keyboardWorks: boolean;
  pointerCapture: boolean;
  restBehavior: boolean;
  score: number;
  maxScore: number;
  evidence: string[];
};

export type JuryVerdict = "reject" | "iterate" | "ship" | "exceptional";

export type JuryReport = {
  version: "0.4.0";
  url: string;
  taste?: string;
  briefPath?: string | null;
  pageType?: string;
  total: number;
  maxTotal: number;
  verdict: JuryVerdict;
  thresholds: { ship: number; exceptional: number };
  dimensions: JuryDimensionScore[];
  solidInteraction: JurySolidInteraction;
  verifyPassed: boolean;
  agentNextSteps: string[];
  seniorAudit?: string[];
};

export const DEFAULT_PHASES: BriefPhase[] = [
  {
    id: "concept",
    title: "Product discovery + concept (no code yet)",
    agentInstructions: [
      "Answer every product discovery question in the brief — in writing.",
      "List every micro-interaction you will ship (from brief Senior micro section) in discovery.md.",
      "Write ONE sentence concept metaphor. If it fits any SaaS or reference, reject it.",
      "Run originality test from brief. If you can name what it looks like → restart.",
      "List 3 things you will NOT include.",
      "UI copy: periods and commas only. No em-dash chains in visible text.",
    ],
    doneWhen: [
      "Discovery questions answered",
      "Concept is one sentence tied to product job",
      "Originality test passed",
      "Reduction list written",
    ],
    doNot: [
      "Pick a look from a reference or taste lane",
      "Open with purple gradient hero",
      "Copy shared technique modules without product fit",
    ],
  },
  {
    id: "layout",
    title: "Static layout lockup",
    agentInstructions: [
      "Build HTML/CSS structure only — no GSAP yet.",
      "Layout must serve the concept sentence — cite why this grid.",
      "Typography hierarchy must work without motion.",
      "Respect project DESIGN.md tokens if present.",
      "Define semantic color tokens in :root (--surface, --ink, --muted, --border, --accent) from brief color section.",
      "Hierarchy through value first — display/price loud, meta copy quiet.",
    ],
    doneWhen: [
      "Readable at mobile + desktop",
      "Layout serves concept",
      "One clear primary action",
      "Semantic color tokens in CSS",
    ],
    doNot: ["Match a reference layoutPattern pixel-for-pixel", "Add grid dot background", "Ship centered icon grid"],
  },
  {
    id: "assets",
    title: "Asset & art direction pass",
    agentInstructions: [
      "Use asset plan from brief: bundled SVG, Lottie search, or custom inline SVG.",
      "Invent visual anchor for THIS product — not a corpus technique demo.",
      "Visual anchor must do real work — not stock clipart or generic gradient blob.",
      "Type and material choices must fit product voice — not default template house style.",
      "Color material in one bounded zone — mesh header, gradient type, or soft card elevation — not full-page blob.",
      "If metaphor is key/lock/mail: start from .premium-taste/assets/*.svg and customize stroke or path.",
    ],
    doneWhen: [
      "Custom visual anchor present",
      "Display type does real work",
      "Assets match concept not reference",
      "One material/color moment with a job",
    ],
    doNot: ["Reuse a prior pass atmosphere because it passed verify before", "Stock illustration", "Normal h1 when concept needs type-as-structure"],
  },
  {
    id: "motion",
    title: "Motion pass",
    agentInstructions: [
      "Motion serves state or story — not wallpaper animation.",
      "Use gsap.context() if GSAP — animate transform/opacity only.",
      "Implement prefers-reduced-motion.",
    ],
    doneWhen: ["Motion has purpose tied to concept", "Reduced motion fallback works"],
    doNot: ["Animate everything because verify checks for motion", "CSS transition soup instead of intentional sequence"],
  },
  {
    id: "interaction",
    title: "Interaction pass",
    agentInstructions: [
      "Implement the declared primary mechanic from concept — not default scrub.",
      "State changes need micro-feedback: toggles, prices, hovers, focus.",
      "Pricing/auth counts: use NumberFlow (number-flow / @number-flow/react) for digit morph — not textContent swap.",
      "Every interactive element needs focus-visible state.",
      "Respect prefers-reduced-motion — instant state when motion reduced.",
    ],
    doneWhen: ["Primary mechanic works", "Focus states visible", "Interaction fits product job"],
    doNot: ["Add solid-scrub because jury rewards it", "Fake buttons", "Decorative LIVE badges"],
  },
  {
    id: "polish",
    title: "Polish + verify",
    agentInstructions: [
      "Run premium-taste verify and jury — must pass for page type.",
      "Re-run originality test. Same senior creative bar — new grammar for this product.",
      "Self-score rubric honestly.",
    ],
    doneWhen: ["premium-taste verify passed", "Originality test still passes", "Rubric ≥ 70/100"],
    doNot: ["Compare side-by-side with reference and copy surface", "Add decorative effects to fake quality"],
  },
];

export const CREATIVE_RUBRIC: RubricDimension[] = [
  {
    id: "productFit",
    title: "Product fit",
    weight: 25,
    criteria: [
      "Screen completes the stated job — user moment clear",
      "Visual choices serve product voice — not a cool pattern",
      "Would feel wrong if swapped onto a different product",
    ],
  },
  {
    id: "originality",
    title: "Originality",
    weight: 25,
    criteria: [
      "Passes originality test — cannot name a reference clone",
      "Same senior creative bar — new grammar",
      "Not generic template house style unless product demands it",
    ],
  },
  {
    id: "concept",
    title: "Concept & art direction",
    weight: 15,
    criteria: [
      "Single memorable metaphor tied to product",
      "Copy matches concept — not lorem / buzzwords",
      "No em-dash chains in UI copy — reads AI-generated",
      "Reduction — empty space intentional",
    ],
  },
  {
    id: "typography",
    title: "Typography as design",
    weight: 15,
    criteria: [
      "Display type does real work for this product",
      "Hierarchy clear without motion",
      "Not default template pairing unless editorial product UI",
    ],
  },
  {
    id: "motion",
    title: "Motion craft",
    weight: 10,
    criteria: [
      "Motion serves state or story",
      "prefers-reduced-motion respected",
    ],
  },
  {
    id: "interaction",
    title: "Interaction",
    weight: 10,
    criteria: [
      "Primary mechanic fits page type — not default scrub",
      "Focus and keyboard accessible",
    ],
  },
];
