# Agentic brand

Brand-kit validator for voice, look, and templates.

## Quick start

Install dependencies and build:

```sh
npm install
npm run build
npm run typecheck
npm test
```

Check the version and help:

```sh
node dist/cli.js --version
node dist/cli.js --help
```

## Use cases

1. Validate a brand kit file before publishing it.
2. Render a branded template with consistent slot values.
3. Check copy against voice rules in a CI job.

## CLI

Summarize text:

```sh
agentic-brand summary --text "hello world hello"
```

Validate a brand kit:

```sh
agentic-brand kit --file kit.json
```

Render a template from a kit:

```sh
agentic-brand render --kit kit.json --template greeting --slots '{"name":"world"}'
```

Check text against a kit voice:

```sh
agentic-brand voice --kit kit.json --text "hello world"
```

Start the MCP server:

```sh
agentic-brand mcp
```

## SDK

Use the library directly:

```js
import { defineBrandKit, renderTemplate, checkVoice, validateBrandKit } from "agentic-brand";

const kit = defineBrandKit({
  voice: { bannedPhrases: ["legacy"], maxChars: 100 },
  look: { colors: { primary: "#000000", background: "#ffffff" } },
  templates: [
    { name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } },
  ],
});

const issues = validateBrandKit(kit);
const rendered = renderTemplate(kit.templates[0], { name: "world" });
const voiceIssues = checkVoice("hello world", kit.voice);
```

## MCP server

Start the server on stdio:

```sh
agentic-brand mcp
```

Available tools: `summarize_text`, `dispatch_text`, `get_cost_report`,
`validate_brand_kit`, `render_template`, `check_voice`.

## Worker

Deploy `src/worker.ts` with Wrangler. It exposes `GET /health`,
`POST /summarize`, and `POST /render`.

## License

MIT. See `LICENSE`.
