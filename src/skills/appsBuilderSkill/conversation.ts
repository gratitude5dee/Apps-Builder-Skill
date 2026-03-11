import {
  AppRequirementsSchema,
  type AppRequirements,
  type AuthConfig,
  type DeploymentConfig,
  type ToolSpec,
  type WidgetSpec,
} from "./schema.js";
import { createBuildPlan, buildPlanSummary, slugify } from "./planner.js";

export type Stage =
  | "collecting"
  | "confirm"
  | "generating"
  | "deploying"
  | "done"
  | "error";

export type Question = {
  id: string;
  prompt: string;
  choices?: string[];
};

export type Completeness = {
  answered: number;
  total: number;
  percent: number;
  missing: string[];
  ready: boolean;
};

export type SkillState = {
  requirements: Partial<AppRequirements>;
  lastQuestionId?: string;
  logs: string[];
  stage: Stage;
  buildPlan?: ReturnType<typeof createBuildPlan>;
  askedQuestions: number;
};

export type InterviewResult = {
  stage: Stage;
  question: Question | null;
  requirements: Partial<AppRequirements>;
  buildPlan: ReturnType<typeof buildPlanSummary> | null;
  deployment: { provider?: string };
  logs: string[];
  completeness: Completeness;
  spec: {
    appName?: string;
    appDescription?: string;
    targetUsers?: string;
    successMetric?: string;
    stackPreset?: string;
  };
  validation: null;
  benchmark: null;
  artifacts: null;
  iterations: [];
};

const sessions = new Map<string, SkillState>();

const QUESTION_BANK: Question[] = [
  {
    id: "identity",
    prompt:
      "What is the app called, and what is its one-line description?",
  },
  {
    id: "users",
    prompt: "Who is this app for?",
  },
  {
    id: "success",
    prompt: "What is the success metric for this app?",
  },
  {
    id: "features",
    prompt:
      "List the core tools or features. One per line or comma-separated is fine.",
  },
  {
    id: "widget",
    prompt:
      "What should the widget do? Mention interactions, routes/screens, charts, or forms.",
  },
  {
    id: "dataAuth",
    prompt:
      "What data sources are needed, and what auth model should we support?",
  },
  {
    id: "delivery",
    prompt:
      "Deployment target? Choose local, Netlify, Cloudflare, or Vercel. You can also mention secret names.",
    choices: ["local", "Netlify", "Cloudflare", "Vercel"],
  },
];

function defaultState(): SkillState {
  return {
    requirements: {},
    logs: [],
    stage: "collecting",
    askedQuestions: 0,
  };
}

export function getSessionId(meta?: Record<string, unknown>): string {
  const session = meta?.["openai/session"] as string | undefined;
  const subject = meta?.["openai/subject"] as string | undefined;
  return session || subject || "default";
}

function getState(sessionId: string): SkillState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, defaultState());
  }
  return sessions.get(sessionId)!;
}

function resetState(sessionId: string): SkillState {
  const next = defaultState();
  sessions.set(sessionId, next);
  return next;
}

function normalize(text?: string) {
  return (text ?? "").trim();
}

function parseList(input: string): string[] {
  return input
    .split(/\n|,|;|\u2022|\*/)
    .map((item) => item.replace(/^[-*\u2022\s]+/, "").trim())
    .filter(Boolean);
}

function parseAppType(text: string): AppRequirements["appType"] | null {
  const value = text.toLowerCase();
  if (value.includes("dashboard")) return "dashboard";
  if (value.includes("workflow") || value.includes("automation")) {
    return "workflow_automation";
  }
  if (value.includes("guide") || value.includes("content")) {
    return "content_guide";
  }
  if (value.includes("assistant") || value.includes("chat-first")) {
    return "chat_first_assistant";
  }
  if (value.includes("tool")) return "tool";
  if (value.includes("app")) return "custom";
  return null;
}

function parseUiMode(text: string): AppRequirements["uiMode"] | null {
  const value = text.toLowerCase();
  if (value.includes("multi-page") || value.includes("multi page")) {
    return "multi_page_ui";
  }
  if (value.includes("chat-only") || value.includes("chat only")) {
    return "chat_only";
  }
  if (
    value.includes("widget") ||
    value.includes("dashboard") ||
    value.includes("form") ||
    value.includes("chart") ||
    value.includes("simple ui")
  ) {
    return "simple_ui";
  }
  return null;
}

function parseProvider(text: string): DeploymentConfig["provider"] | null {
  const value = text.toLowerCase();
  if (value.includes("local")) return "local";
  if (value.includes("netlify")) return "netlify";
  if (value.includes("cloudflare")) return "cloudflare";
  if (value.includes("vercel")) return "vercel";
  return null;
}

function parseAuth(text: string): AuthConfig {
  const value = text.toLowerCase();
  if (
    value.includes("none") ||
    value.includes("no auth") ||
    value.includes("without auth")
  ) {
    return { type: "none" };
  }
  if (value.includes("oauth")) {
    const provider = value.includes("google")
      ? "google"
      : value.includes("github")
        ? "github"
        : undefined;
    return { type: "oauth", provider };
  }
  if (value.includes("api key")) {
    return { type: "api_key" };
  }
  if (value.includes("session") || value.includes("cookie")) {
    return { type: "session" };
  }
  return { type: "none" };
}

function inferAppName(text: string): string | undefined {
  const quoted = text.match(/["“]([^"”]{3,})["”]/);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }
  const named = text.match(/(?:called|named)\s+([a-zA-Z0-9 _-]{3,})/i);
  if (named?.[1]) {
    return named[1].trim();
  }
  const words = text
    .replace(/build me|create|make/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
  return words ? words.replace(/[^a-zA-Z0-9 -]/g, "").trim() : undefined;
}

function inferAppDescription(text: string): string | undefined {
  const cleaned = text.trim();
  if (!cleaned) return undefined;
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function inferToolSpecs(features: string[]): ToolSpec[] {
  return features.map((feature) => ({
    name: slugify(feature),
    title: feature,
    description: `Execute the ${feature.toLowerCase()} flow inside the generated app.`,
    inputSchema: "prompt?: string",
    interactive: true,
  }));
}

function inferWidgetSpec(
  requirements: Partial<AppRequirements>,
  widgetAnswer?: string
): WidgetSpec | undefined {
  const summary =
    widgetAnswer?.trim() ||
    requirements.appDescription ||
    "Interactive widget for the generated ChatGPT app.";
  const components = widgetAnswer
    ? parseList(widgetAnswer).slice(0, 6)
    : requirements.primaryFeatures?.slice(0, 4) ?? [];
  const normalizedComponents =
    components.length > 0 ? components : ["summary panel", "primary action button"];
  const routes =
    requirements.uiMode === "multi_page_ui"
      ? ["/", "/details"]
      : ["/"];
  const bridgeFeatures = [
    "ui/initialize",
    "ui/notifications/initialized",
    "ui/notifications/tool-result",
  ];
  const charts = normalizedComponents.filter((item) =>
    /(chart|graph|metric|progress)/i.test(item)
  );

  return {
    summary,
    components: normalizedComponents,
    routes,
    bridgeFeatures,
    charts,
  };
}

function parseEnvNames(text: string): string[] {
  if (!text) return [];
  if (text.toLowerCase().includes("none")) return [];
  return parseList(text).map((name) => name.toUpperCase());
}

function applyIdentityAnswer(state: SkillState, answer: string) {
  const lines = answer
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  state.requirements.appName =
    lines.length > 0 ? lines[0].replace(/^name:\s*/i, "") : inferAppName(answer);
  state.requirements.appDescription =
    lines.length > 1
      ? lines.slice(1).join(" ")
      : inferAppDescription(answer) ?? state.requirements.appDescription;
}

function applyAnswer(state: SkillState, questionId: string, answer: string) {
  switch (questionId) {
    case "identity":
      applyIdentityAnswer(state, answer);
      break;
    case "users":
      state.requirements.targetUsers = answer;
      break;
    case "success":
      state.requirements.successMetric = answer;
      break;
    case "features": {
      const features = parseList(answer).slice(0, 7);
      if (features.length > 0) {
        state.requirements.primaryFeatures = features;
        state.requirements.toolSpecs = inferToolSpecs(features);
      }
      break;
    }
    case "widget":
      state.requirements.widgetSpec = inferWidgetSpec(state.requirements, answer);
      break;
    case "dataAuth": {
      const integrations = answer.toLowerCase().includes("none")
        ? []
        : parseList(answer).filter(
            (item) => !/(auth|oauth|api key|session|none)/i.test(item)
          );
      state.requirements.dataIntegrations = integrations;
      state.requirements.auth = parseAuth(answer);
      break;
    }
    case "delivery": {
      const provider = parseProvider(answer);
      state.requirements.deployment = {
        provider: provider ?? "local",
        envNames: parseEnvNames(answer),
      };
      break;
    }
    default:
      break;
  }
}

function inferFromPrompt(state: SkillState, message: string) {
  if (!message) return;

  if (!state.requirements.rawPrompt) {
    state.requirements.rawPrompt = message;
  }

  const appType = parseAppType(message);
  if (appType && !state.requirements.appType) {
    state.requirements.appType = appType;
  }

  const uiMode = parseUiMode(message);
  if (uiMode && !state.requirements.uiMode) {
    state.requirements.uiMode = uiMode;
  }

  if (!state.requirements.appName) {
    const appName = inferAppName(message);
    if (appName) {
      state.requirements.appName = appName;
    }
  }

  if (!state.requirements.appDescription) {
    const appDescription = inferAppDescription(message);
    if (appDescription) {
      state.requirements.appDescription = appDescription;
    }
  }

  if (!state.requirements.primaryFeatures) {
    const bulletLines = message
      .split("\n")
      .filter((line) => /^\s*[-*\u2022]/.test(line));
    const features = parseList(
      bulletLines.length > 0 ? bulletLines.join("\n") : message
    ).slice(0, 7);
    if (features.length > 1) {
      state.requirements.primaryFeatures = features;
      state.requirements.toolSpecs = inferToolSpecs(features);
    }
  }

  const provider = parseProvider(message);
  if (provider && !state.requirements.deployment?.provider) {
    state.requirements.deployment = {
      provider,
      envNames: parseEnvNames(message),
    };
  }

  if (!state.requirements.auth) {
    state.requirements.auth = parseAuth(message);
  }
}

function finalizeRequirements(
  requirements: Partial<AppRequirements>
): AppRequirements | null {
  const primaryFeatures =
    requirements.primaryFeatures && requirements.primaryFeatures.length > 0
      ? requirements.primaryFeatures
      : requirements.appDescription
        ? [requirements.appDescription]
        : [];
  const toolSpecs =
    requirements.toolSpecs && requirements.toolSpecs.length > 0
      ? requirements.toolSpecs
      : inferToolSpecs(primaryFeatures);
  const appType =
    requirements.appType ??
    (requirements.appDescription
      ? parseAppType(requirements.appDescription) ?? "custom"
      : "custom");
  const uiMode =
    requirements.uiMode ??
    (requirements.widgetSpec?.components.some((item) =>
      /(chart|table|dashboard)/i.test(item)
    )
      ? "simple_ui"
      : "simple_ui");
  const widgetSpec =
    requirements.widgetSpec ?? inferWidgetSpec({ ...requirements, uiMode });
  const deployment = requirements.deployment ?? {
    provider: "local",
    envNames: [],
  };
  const auth = requirements.auth ?? { type: "none" };
  const appName =
    requirements.appName ??
    (requirements.appDescription
      ? inferAppName(requirements.appDescription) ?? "Supreme ChatGPT App"
      : undefined);
  const appDescription = requirements.appDescription;
  const targetUsers = requirements.targetUsers;
  const successMetric = requirements.successMetric;

  const candidate = {
    appType,
    targetUserAndSuccess: targetUsers && successMetric
      ? `${targetUsers}. Success means ${successMetric}.`
      : requirements.targetUserAndSuccess,
    primaryFeatures,
    dataIntegrations: requirements.dataIntegrations ?? [],
    uiMode,
    deployment,
    appName,
    appDescription,
    targetUsers,
    successMetric,
    toolSpecs,
    widgetSpec,
    auth,
    stackPreset: requirements.stackPreset ?? "mcp_apps_kit_react",
    refinementBudget: requirements.refinementBudget ?? 8,
    refinements: requirements.refinements ?? [],
    rawPrompt: requirements.rawPrompt,
  };

  const parsed = AppRequirementsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function missingQuestion(requirements: Partial<AppRequirements>): Question | null {
  const required = [
    ["identity", Boolean(requirements.appName && requirements.appDescription)],
    ["users", Boolean(requirements.targetUsers)],
    ["success", Boolean(requirements.successMetric)],
    [
      "features",
      Boolean(requirements.primaryFeatures && requirements.primaryFeatures.length > 0),
    ],
    ["widget", Boolean(requirements.widgetSpec?.summary)],
    [
      "dataAuth",
      Boolean(
        requirements.dataIntegrations !== undefined && requirements.auth !== undefined
      ),
    ],
    ["delivery", Boolean(requirements.deployment?.provider)],
  ] as const;

  const nextId = required.find(([, satisfied]) => !satisfied)?.[0];
  return QUESTION_BANK.find((question) => question.id === nextId) ?? null;
}

function computeCompleteness(requirements: Partial<AppRequirements>): Completeness {
  const total = QUESTION_BANK.length;
  const missing = QUESTION_BANK.filter((question) => {
    switch (question.id) {
      case "identity":
        return !(requirements.appName && requirements.appDescription);
      case "users":
        return !requirements.targetUsers;
      case "success":
        return !requirements.successMetric;
      case "features":
        return !requirements.primaryFeatures || requirements.primaryFeatures.length === 0;
      case "widget":
        return !requirements.widgetSpec?.summary;
      case "dataAuth":
        return requirements.dataIntegrations === undefined || requirements.auth === undefined;
      case "delivery":
        return !requirements.deployment?.provider;
      default:
        return true;
    }
  }).map((question) => question.id);
  const answered = total - missing.length;
  return {
    answered,
    total,
    percent: Math.round((answered / total) * 100),
    missing,
    ready: missing.length === 0,
  };
}

function makeResult(state: SkillState, question: Question | null): InterviewResult {
  const finalized = finalizeRequirements(state.requirements);
  const plan = finalized ? createBuildPlan(finalized) : null;
  const completeness = computeCompleteness(state.requirements);

  state.buildPlan = plan ?? undefined;
  state.stage = finalized ? "confirm" : "collecting";

  return {
    stage: state.stage,
    question,
    requirements: finalized ?? state.requirements,
    buildPlan: finalized ? buildPlanSummary(plan, finalized) : null,
    deployment: {
      provider:
        finalized?.deployment.provider ?? state.requirements.deployment?.provider,
    },
    logs: state.logs,
    completeness,
    spec: {
      appName: state.requirements.appName,
      appDescription: state.requirements.appDescription,
      targetUsers: state.requirements.targetUsers,
      successMetric: state.requirements.successMetric,
      stackPreset: state.requirements.stackPreset ?? "mcp_apps_kit_react",
    },
    validation: null,
    benchmark: null,
    artifacts: null,
    iterations: [],
  };
}

export function runInterview(
  input: { message?: string; command?: string },
  meta?: Record<string, unknown>
): InterviewResult {
  const sessionId = getSessionId(meta);
  const state =
    input.command?.toLowerCase().includes("restart")
      ? resetState(sessionId)
      : getState(sessionId);
  const message = normalize(input.message);

  if (message) {
    inferFromPrompt(state, message);
    if (state.lastQuestionId) {
      applyAnswer(state, state.lastQuestionId, message);
    }
    state.logs = [...state.logs, `Captured input for ${state.lastQuestionId ?? "spec"}.`];
  }

  const finalized = finalizeRequirements(state.requirements);
  if (finalized) {
    state.requirements = finalized;
    state.lastQuestionId = undefined;
    state.logs = [...state.logs, "Spec is complete and ready to generate."];
    return makeResult(state, null);
  }

  const question = missingQuestion(state.requirements);
  state.lastQuestionId = question?.id;
  if (question) {
    state.askedQuestions += 1;
  }
  return makeResult(state, question);
}

export function getConfirmedRequirements(
  meta?: Record<string, unknown>
): AppRequirements | null {
  const sessionId = getSessionId(meta);
  const state = getState(sessionId);
  return finalizeRequirements(state.requirements);
}
