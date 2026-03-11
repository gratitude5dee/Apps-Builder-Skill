import type {
  AppRequirements,
  BuildPlan,
} from "../../../skills/appsBuilderSkill/schema.js";

export function renderWebApp(plan: BuildPlan, requirements: AppRequirements) {
  const toolNames = plan.tools.map((tool) => tool.name);
  const routeList = requirements.widgetSpec.routes;

  return `import * as Progress from "@radix-ui/react-progress";
import React, { startTransition, useEffect, useState } from "react";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";

const TOOL_NAMES = ${JSON.stringify(toolNames, null, 2)};
const ROUTES = ${JSON.stringify(routeList, null, 2)};
const APP_INFO = { name: "generated-app-ui", version: "0.1.0" };
const PROTOCOL_VERSION = "2026-01-26";

type ToolResult = {
  structuredContent?: {
    appName?: string;
    tool?: string;
    prompt?: string;
    message?: string;
    insight?: string;
  };
};

export default function App() {
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);
  const [activity, setActivity] = useState(18);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;
      if (message.method !== "ui/notifications/tool-result") return;
      startTransition(() => {
        setToolResult(message.params ?? null);
        setActivity(100);
      });
      window.setTimeout(() => setActivity(42), 800);
    };

    window.addEventListener("message", handler, { passive: true });
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    window.parent.postMessage(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "ui/initialize",
        params: {
          appInfo: APP_INFO,
          appCapabilities: {},
          protocolVersion: PROTOCOL_VERSION,
        },
      },
      "*"
    );
    window.parent.postMessage(
      { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
      "*"
    );
  }, []);

  const content = toolResult?.structuredContent;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,240,214,0.95),_transparent_35%),linear-gradient(180deg,_#fffdf8_0%,_#f4f7fb_100%)] p-4 text-slate-900">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                Supreme Widget
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                ${requirements.appName}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                ${requirements.appDescription}
              </p>
            </div>
            <Badge>${requirements.stackPreset}</Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tools</p>
              <p className="mt-2 text-2xl font-semibold">{TOOL_NAMES.length}</p>
            </div>
            <div className="rounded-2xl bg-orange-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-600">Routes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{ROUTES.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Auth</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                ${requirements.auth.type}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
              <span>Widget Activity</span>
              <span>{activity}%</span>
            </div>
            <Progress.Root className="h-3 overflow-hidden rounded-full bg-slate-200" value={activity}>
              <Progress.Indicator
                className="h-full bg-[linear-gradient(90deg,#ff7a18,#ffb347)] transition-all duration-500"
                style={{ transform: \`translateX(-\${100 - activity}%)\` }}
              />
            </Progress.Root>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Latest tool result</h2>
              <Badge>{content?.tool ?? "idle"}</Badge>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><strong className="text-slate-900">Prompt:</strong> {content?.prompt || "Waiting for the first tool call."}</p>
              <p><strong className="text-slate-900">Message:</strong> {content?.message || "The widget syncs with the most recent tool result."}</p>
              <p><strong className="text-slate-900">Success metric:</strong> {content?.insight || ${JSON.stringify(
                requirements.successMetric
              )}}</p>
            </div>
          </article>

          <aside className="rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <h2 className="text-lg font-semibold">Launch plan</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {TOOL_NAMES.map((tool) => (
                <li key={tool} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  {tool}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {ROUTES.map((route) => (
                <span key={route} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                  {route}
                </span>
              ))}
            </div>
            <div className="mt-5">
              <Button variant="primary">Run from chat</Button>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
`;
}
