# agentic-brand

[![npm version](https://img.shields.io/npm/v/agentic-brand)](https://www.npmjs.com/package/agentic-brand)
[![Downloads/month](https://img.shields.io/npm/dm/agentic-brand)](https://www.npmjs.com/package/agentic-brand)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/license/mit)

[Package](https://www.npmjs.com/package/agentic-brand) · [Quickstart](#validate-your-first-brand-kit) · [Runtime surfaces](#runtime-surfaces)

agentic-brand is an open-source brand-kit validator for developers who check copy, color contrast, and templates in code.
It provides a TypeScript SDK, a command-line interface (CLI), and Model Context Protocol (MCP) tools.
Voice checks use text rules; template rendering uses named slots.

## Install

```sh
npm install agentic-brand
```

Node.js 18 or later is required. The package includes TypeScript declarations and three direct runtime dependencies.

## Validate your first brand kit

Save this as `brand-demo.mjs`. No credentials, environment variables, or `.env` loader are required.

```js
import { defineBrandKit, validateBrandKit, renderTemplate, checkVoice } from "agentic-brand";

const kit = defineBrandKit({
  voice: { maxChars: 100, bannedPhrases: ["guaranteed"] },
  look: { colors: { text: "#000000", background: "#ffffff" } },
  templates: [{
    name: "greeting",
    body: "Hello {{name}}",
    slots: { name: { required: true } },
  }],
});
console.log(validateBrandKit(kit));
console.log(renderTemplate(kit.templates[0], { name: "world" }));
console.log(checkVoice("Hello world", kit.voice));
```

```sh
node brand-demo.mjs
```

Success prints `[]`, `Hello world`, and `[]`, in that order.

## How it works

```text
Brand-kit JSON -> schema and color validation -> parsed kit
Parsed kit + slot values -> rendered text -> voice issues
Parsed kit + color pairs -> contrast issues
```

## Why it exists

Teams need repeatable checks for copy and brand-kit data before publication.
Style Dictionary transforms design tokens. Bootstrap provides styling utilities.
agentic-brand checks kit data and copy through code and agent tools.

## Compare

Scope checked on 2026-10-14 against the linked product documentation.

| Scope | agentic-brand | [Style Dictionary](https://styledictionary.com/info/tokens/) | [Bootstrap](https://getbootstrap.com/docs/5.3/utilities/colors/) |
| --- | --- | --- | --- |
| Primary task | Kit validation and text templates | Design-token transformation | UI styling utilities |
| This package's role | Local SDK, CLI, MCP server | No adapter included | No adapter included |

## Coverage

| Surface | Status | Behavior |
| --- | --- | --- |
| Brand-kit JSON | ✓ | Zod schemas and hexadecimal color validation |
| Voice checks | ✓ | Length, banned substrings, literal tone-tag matching |
| Color contrast | ✓ | Configurable AA and AAA thresholds |
| Named templates | ✓ | Required slots, defaults, and supplied-value patterns |
| Local text router | scaffold | Generates receipts; sends nothing to an external service |
| Generic HTTP router | ✓ | Posts `{text}` to an endpoint you provide |
| Cloudflare Workers handler | ✓ | Source handler for health, summary, and rendering |

The source contains two routing adapters and no brand-specific vendor connector registry.
Coverage is source-checked and locally tested; no external credentials or deployed Worker were verified.

## Common use cases

1. TypeScript teams validate brand-kit JSON before a release.
2. Node.js copy pipelines reject banned phrases and overlong text.
3. Design-system teams check hexadecimal color pairs from a JSON kit.
4. MCP client developers expose template rendering to an agent over stdio.

## Features

- **Kit validation:** Parse JSON with `brandKitFromJson` or objects with `defineBrandKit`.
- **Voice checks:** Inspect text with `checkVoice`; see [behavior limits](#delivery-and-behavior-limits).
- **Contrast checks:** Use `validateLook` or `validateBrandKit` for configured color pairs.
- **Templates:** Render `{{slot}}` placeholders with `renderTemplate`.
- **Text utilities:** Summarize text, preview dispatches, and read session cost units.

## Runtime surfaces

The SDK exports kit, voice, look, template, and shared `agentic-core` utilities.
The CLI and stdio server run on Node.js.

| CLI command | Purpose |
| --- | --- |
| `summary --text "hello"` | Text statistics; accepts `--file` and `--top` |
| `dispatch --text "hello" --dry-run` | Preview local routing; accepts `--file` |
| `costs` | Current process cost report |
| `kit --file kit.json` | Kit and contrast issues |
| `render --kit kit.json --template greeting --slots '{"name":"world"}'` | Render a named template |
| `voice --kit kit.json --text "hello"` | Voice issues; accepts `--file` |
| `mcp` | Start the stdio server |

Run commands with `npx agentic-brand`. Use `--help` and `--version` for help and version output.
The separate `agentic-brand-mcp` executable also starts the server.

All six MCP tools: `summarize_text`, `dispatch_text`, `get_cost_report`, `validate_brand_kit`, `render_template`, and `check_voice`.

The Worker source exposes `GET /health`, `POST /summarize`, and `POST /render`.
`PACK_NAME` optionally changes the health response's package label.

## Delivery and behavior limits

- Voice `rules` and descriptions are stored metadata; checks do not interpret them.
- Tone checks search for literal tags. They do not classify writing style.
- Contrast calculations ignore alpha channels and do not certify page accessibility.
- Kit validation returns contrast issues; check copy separately with `checkVoice`.
- Optional missing template slots become empty strings. Default values bypass pattern checks.
- Template output is plain text; escape it before insertion into HTML.
- CLI issue responses can exit with code zero. Inspect `valid` or `issues` in automation.
- Default dispatch uses a local receipt adapter. HTTP dispatch has no automatic retry or deduplication.
- Cost units count dispatched characters in memory; they are not currency or persistent billing records.
- The Worker handler has no authentication layer. Add access controls before deployment.

## Integration guides

- [Node.js brand-kit quickstart](#validate-your-first-brand-kit)
- [CLI and MCP tool reference](#runtime-surfaces)
- [Cloudflare Workers configuration](https://github.com/pooriaarab/agentic-brand/blob/main/wrangler.jsonc) for a Worker you deploy.

The repository is public. No separate public documentation site is configured.

## Status

Version 0.1.0 is an early release; APIs can change before 1.0.
Report reproducible problems through [GitHub issues](https://github.com/pooriaarab/agentic-brand/issues).
Public case studies are not yet published in this repository.

## FAQ

### What is agentic-brand?

agentic-brand validates brand-kit data and checks text against configured voice constraints.
It also renders named templates and computes color contrast.

### Which integrations are verified?

agentic-brand has source-checked local and generic HTTP adapters, plus a Cloudflare Workers handler.
External services and deployed Workers were not credential-checked for this rewrite.

### Does agentic-brand provide a managed brand service?

agentic-brand runs in your process or a Worker you deploy.
You provide deployment, access controls, and storage.

### How is agentic-brand different from Style Dictionary?

agentic-brand checks copy rules, contrast, and template slots.
Style Dictionary transforms design tokens into platform outputs; see its [token documentation](https://styledictionary.com/info/tokens/).

### How is agentic-brand different from Bootstrap?

agentic-brand validates input data and text without a UI framework.
Bootstrap supplies styling utilities; see its [color documentation](https://getbootstrap.com/docs/5.3/utilities/colors/).

### Does agentic-brand use AI to check tone?

agentic-brand checks whether text contains any configured tone tag.
It does not call a language model or interpret free-form voice rules.

### Can agentic-brand fail my CI job?

agentic-brand returns issue arrays that your script can inspect.
Set a failing exit code yourself when issues exist; CLI issue output alone can exit successfully.

### Does agentic-brand need API keys?

agentic-brand needs no API keys for local validation, rendering, or text summaries.
A generic HTTP destination may need infrastructure that you configure separately.

## Contributing

Install repository dependencies with `npm ci`.
Run `npm run build`, `npm run typecheck`, and `npm test` before submitting changes.

## License

MIT. See the [license text](https://opensource.org/license/mit).
