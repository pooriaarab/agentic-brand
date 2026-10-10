---
name: agentic-brand
description: Brand-kit validator for voice, look, and templates. Keywords: brand-kit, voice, templates, agentic-suite, claude-code, codex, cli, mcp.
---

# agentic-brand

Brand-kit validator for voice, look, and templates.

## Use the SDK

```js
import { defineBrandKit, renderTemplate, checkVoice, validateBrandKit } from "agentic-brand";

const kit = defineBrandKit({
  voice: { bannedPhrases: ["legacy"], maxChars: 100 },
  look: { colors: { primary: "#000000", background: "#ffffff" } },
  templates: [{ name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } }],
});

validateBrandKit(kit);
renderTemplate(kit.templates[0], { name: "world" });
checkVoice("hello world", kit.voice);
```

## Use the CLI

```sh
agentic-brand kit --file kit.json
agentic-brand render --kit kit.json --template greeting --slots '{"name":"world"}'
agentic-brand voice --kit kit.json --text "hello world"
```

## Use the MCP server

Start the server with `agentic-brand mcp`. Call `validate_brand_kit`
to validate a kit, `render_template` for templates, `check_voice` for
voice checks, and `get_cost_report` for costs.

## Rules

- Validate the kit before rendering or checking voice.
- Preview each route with dry run first.
- Report guard denials and adapter errors as failures.
- Read the cost report at the end.
