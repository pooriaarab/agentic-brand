#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  dispatchText,
  getCostReport,
  GuardError,
  LocalRouterAdapter,
  summarizeText,
  VendorError,
  type RouterAdapter,
} from "./core.js";
import { DEFAULT_BRAND } from "./index.js";
import { VERSION } from "./version.js";
import {
  brandKitFromJson,
  checkVoice,
  renderTemplate,
  validateBrandKit,
  type BrandKit,
} from "./brand.js";

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export type CliCommand =
  | "summary"
  | "dispatch"
  | "costs"
  | "mcp"
  | "help"
  | "version"
  | "kit"
  | "render"
  | "voice";

export interface CliRequest {
  command: CliCommand;
  text?: string;
  file?: string;
  dryRun: boolean;
  topN?: number;
  kit?: string;
  template?: string;
  slots?: string;
}

export function parseArgs(argv: string[]): CliRequest {
  const request: CliRequest = { command: "help", dryRun: false };
  const args = [...argv];
  const first = args.shift();
  if (first === undefined || first === "--help" || first === "-h") {
    return request;
  }
  if (first === "--version" || first === "-V") {
    request.command = "version";
    return request;
  }
  if (
    first !== "summary" &&
    first !== "dispatch" &&
    first !== "costs" &&
    first !== "mcp" &&
    first !== "kit" &&
    first !== "render" &&
    first !== "voice"
  ) {
    throw new UsageError(`unknown command "${first}"`);
  }
  request.command = first;
  while (args.length > 0) {
    const flag = args.shift() as string;
    if (flag === "--dry-run" && request.command === "dispatch") {
      request.dryRun = true;
      continue;
    }
    if (
      (flag === "--text" || flag === "--file" || flag === "--top" || flag === "--kit" || flag === "--template" || flag === "--slots") &&
      args.length > 0
    ) {
      const value = args.shift() as string;
      if (flag === "--text") request.text = value;
      if (flag === "--file") request.file = value;
      if (flag === "--top") {
        const topN = Number.parseInt(value, 10);
        if (!Number.isInteger(topN) || topN < 0) {
          throw new UsageError(`--top needs an integer of 0 or more, got "${value}"`);
        }
        request.topN = topN;
      }
      if (flag === "--kit") request.kit = value;
      if (flag === "--template") request.template = value;
      if (flag === "--slots") request.slots = value;
      continue;
    }
    throw new UsageError(`unknown flag "${flag}" for "${request.command}"`);
  }
  if (
    (request.command === "summary" || request.command === "dispatch") &&
    request.text === undefined &&
    request.file === undefined
  ) {
    throw new UsageError(`${request.command} needs --text or --file`);
  }
  if (request.command === "kit" && request.file === undefined) {
    throw new UsageError(`kit needs --file`);
  }
  if (request.command === "render") {
    if (request.kit === undefined) throw new UsageError(`render needs --kit`);
    if (request.template === undefined) throw new UsageError(`render needs --template`);
    if (request.slots === undefined) throw new UsageError(`render needs --slots`);
  }
  if (request.command === "voice") {
    if (request.kit === undefined) throw new UsageError(`voice needs --kit`);
    if (request.text === undefined && request.file === undefined) {
      throw new UsageError(`voice needs --text or --file`);
    }
  }
  return request;
}

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
  readFile(path: string): string;
  router: RouterAdapter;
}

function defaultIo(): CliIo {
  return {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
    readFile: (path) => readFileSync(path, "utf8"),
    router: new LocalRouterAdapter(),
  };
}

function helpText(): string {
  const command = DEFAULT_BRAND.command;
  return [
    `${DEFAULT_BRAND.name} ${VERSION}`,
    `${DEFAULT_BRAND.description}`,
    "",
    `Usage: ${command} <command> [flags]`,
    "",
    "Commands:",
    "  summary --text <t> [--file <p>] [--top <n>]  Print text stats as JSON.",
    "  dispatch --text <t> [--file <p>] [--dry-run] Route one text, print the receipt.",
    "  costs                                      Print the cost report as JSON.",
    "  mcp                                        Start the MCP server on stdio.",
    "  kit --file <p>                             Validate a brand kit JSON file.",
    "  render --kit <p> --template <n> --slots <j> Render a template from the kit.",
    "  voice --kit <p> --text <t> [--file <p>]     Check text against the kit voice.",
    "",
    "Flags:",
    "  --help, -h       Print this help.",
    "  --version, -V    Print the version.",
  ].join("\n");
}

function readInput(request: CliRequest, io: CliIo): string {
  if (request.file !== undefined) {
    return io.readFile(request.file);
  }
  return request.text ?? "";
}

function readKit(path: string, io: CliIo): BrandKit {
  const raw = io.readFile(path);
  return brandKitFromJson(raw);
}

export async function runCli(argv: string[], io: CliIo = defaultIo()): Promise<number> {
  let request: CliRequest;
  try {
    request = parseArgs(argv);
  } catch (error) {
    io.err(error instanceof Error ? error.message : String(error));
    io.err(`Run "${DEFAULT_BRAND.command} --help" for usage.`);
    return 2;
  }
  try {
    switch (request.command) {
      case "help":
        io.out(helpText());
        return 0;
      case "version":
        io.out(VERSION);
        return 0;
      case "summary": {
        const summary = summarizeText(readInput(request, io), { topN: request.topN });
        io.out(JSON.stringify(summary));
        return 0;
      }
      case "dispatch": {
        const result = await dispatchText(readInput(request, io), {
          adapter: io.router,
          dryRun: request.dryRun,
        });
        io.out(JSON.stringify(result));
        return 0;
      }
      case "costs":
        io.out(JSON.stringify(getCostReport()));
        return 0;
      case "mcp": {
        const { startMcp } = await import("./mcp.js");
        await startMcp();
        return 0;
      }
      case "kit": {
        const kit = readKit(request.file as string, io);
        const issues = validateBrandKit(kit);
        io.out(JSON.stringify({ valid: issues.length === 0, issues }));
        return 0;
      }
      case "render": {
        const kit = readKit(request.kit as string, io);
        const templateName = request.template as string;
        const template = kit.templates.find((t) => t.name === templateName);
        if (template === undefined) {
          throw new Error(`template "${templateName}" not found in kit`);
        }
        const slots = JSON.parse(request.slots as string) as Record<string, string>;
        const rendered = renderTemplate(template, slots);
        io.out(JSON.stringify({ rendered }));
        return 0;
      }
      case "voice": {
        const kit = readKit(request.kit as string, io);
        const text = readInput(request, io);
        const issues = checkVoice(text, kit.voice);
        io.out(JSON.stringify({ issues }));
        return 0;
      }
    }
  } catch (error) {
    if (
      error instanceof GuardError ||
      error instanceof VendorError ||
      error instanceof UsageError ||
      (error instanceof Error && error.name === "BrandError")
    ) {
      io.err(`${error.name}: ${error.message}`);
      return 1;
    }
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      io.err(`file not found: ${request.file ?? ""}`);
      return 1;
    }
    throw error;
  }
}

function isMainModule(): boolean {
  const invoked = process.argv[1];
  if (typeof invoked !== "string") return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(invoked)).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli(process.argv.slice(2)).then(
    (code) => {
      if (code !== 0) process.exit(code);
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
