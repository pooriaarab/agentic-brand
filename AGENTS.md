# agentic-brand agent guide

Brand-kit validator for voice, look, and templates.

## Mental model

A brand kit holds voice rules, look colors, and named templates. The
pack validates the kit, renders templates with slot values, and checks
text against the voice.

## The three faces

- SDK: `import { defineBrandKit, renderTemplate, checkVoice } from "agentic-brand"`.
- CLI: `npx agentic-brand kit --file kit.json`.
- MCP: `npx agentic-brand mcp`, then call a tool below.

Keywords: brand-kit, voice, templates, agentic-suite, claude-code, codex, cli, mcp.

## MCP tools

| Tool | Use it for |
| --- | --- |
| summarize_text | Count chars, words, lines, top words. |
| dispatch_text | Route one text. Pass dryRun to preview. |
| get_cost_report | Read session cost totals. |
| validate_brand_kit | Validate a brand kit JSON string. |
| render_template | Render a named template with slot values. |
| check_voice | Check text against the kit voice rules. |

## The loop

1. Discover the tools with `tools/list`.
2. Validate a brand kit with `validate_brand_kit`.
3. Render a template with `render_template`.
4. Check generated copy with `check_voice`.
5. Read `get_cost_report` and state the cost.

## Rules

- Validate the kit before rendering or checking voice.
- Preview each dispatch with dry run before a real route.
- Stop when a guard denies the call. State the reason.
- Never retry a denied call with changed text to dodge a guard.
- Report adapter errors as errors. Never present them as success.
- State the cost report before you claim the task is done.
