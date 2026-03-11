---
name: chatgpt-apps-builder
description: Build ChatGPT Apps SDK projects with SupremeAppsBuilder v2: adaptive interview, modern MCP widget scaffolds, validation, smoke benchmarking, and deployment via local/Netlify/Cloudflare/Vercel.
---

# ChatGPT Apps Builder

## Overview

Generate Apps SDK projects end-to-end: collect requirements adaptively, scaffold a modern widget + MCP server, validate the output, run the smoke benchmark, and deploy with MCP adapters or CLI fallback.

## Workflow

1. Gather requirements with the adaptive interview flow.
2. Generate the app into `generated/<slug>/` using the v2 template family under `src/builder/templates/`.
3. Validate the generated project via `src/builder/validate.ts` and `src/mcp/`.
4. Run the smoke benchmark and persist benchmark artifacts.
5. Deploy through MCP adapters or local preview instructions.

## Key Paths

- Builder logic: `apps-builder-skill/src/skills/appsBuilderSkill/`
- Templates: `apps-builder-skill/src/builder/templates/`
- Prompt assets: `apps-builder-skill/src/builder/prompts/`
- MCP test harness: `apps-builder-skill/src/mcp/`
- Builder UI: `apps-builder-skill/web/`
- Benchmark CLI: `apps-builder-skill/skillsbench/`
- Generated output: `apps-builder-skill/generated/`

## Quality Bar

- Keep the interview fast and non-repetitive; skip questions already inferred.
- Never log secret values; only log secret names.
- Ensure `apps_builder_generate` returns a URL or explicit fallback instructions.
- Ensure validation and smoke benchmark results are returned in structured output.
