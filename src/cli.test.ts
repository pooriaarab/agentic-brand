import { describe, expect, test } from "vitest";
import { parseArgs, runCli, UsageError, type CliIo } from "./cli.js";
import { LocalRouterAdapter } from "./core.js";

function testIo(overrides: Partial<CliIo> = {}): CliIo & { outLines: string[]; errLines: string[] } {
  const outLines: string[] = [];
  const errLines: string[] = [];
  return {
    outLines,
    errLines,
    out: (line) => outLines.push(line),
    err: (line) => errLines.push(line),
    readFile: (path) => `file:${path}`,
    router: new LocalRouterAdapter(),
    ...overrides,
  };
}

describe("parseArgs", () => {
  test("empty args print help", () => {
    expect(parseArgs([]).command).toBe("help");
  });

  test("--version selects version", () => {
    expect(parseArgs(["--version"]).command).toBe("version");
  });

  test("summary takes text and top", () => {
    expect(parseArgs(["summary", "--text", "hi", "--top", "2"])).toEqual({
      command: "summary",
      text: "hi",
      topN: 2,
      dryRun: false,
    });
  });

  test("dispatch takes dry run", () => {
    const request = parseArgs(["dispatch", "--text", "hi", "--dry-run"]);
    expect(request.command).toBe("dispatch");
    expect(request.dryRun).toBe(true);
  });

  test("kit takes file", () => {
    const request = parseArgs(["kit", "--file", "kit.json"]);
    expect(request.command).toBe("kit");
    expect(request.file).toBe("kit.json");
  });

  test("render takes kit, template, and slots", () => {
    const request = parseArgs([
      "render",
      "--kit",
      "kit.json",
      "--template",
      "greeting",
      "--slots",
      '{"name":"world"}',
    ]);
    expect(request.command).toBe("render");
    expect(request.kit).toBe("kit.json");
    expect(request.template).toBe("greeting");
    expect(request.slots).toBe('{"name":"world"}');
  });

  test("voice takes kit and text", () => {
    const request = parseArgs(["voice", "--kit", "kit.json", "--text", "hi"]);
    expect(request.command).toBe("voice");
    expect(request.kit).toBe("kit.json");
    expect(request.text).toBe("hi");
  });

  test("unknown command throws UsageError", () => {
    expect(() => parseArgs(["frobnicate"])).toThrow(UsageError);
  });

  test("summary without input throws", () => {
    expect(() => parseArgs(["summary"])).toThrow(/needs --text or --file/);
  });

  test("bad top value throws", () => {
    expect(() => parseArgs(["summary", "--text", "hi", "--top", "many"])).toThrow(/--top/);
  });

  test("kit without file throws", () => {
    expect(() => parseArgs(["kit"])).toThrow(/needs --file/);
  });

  test("render without kit throws", () => {
    expect(() => parseArgs(["render", "--template", "greeting", "--slots", "{}"])).toThrow(
      /needs --kit/,
    );
  });

  test("voice without text throws", () => {
    expect(() => parseArgs(["voice", "--kit", "kit.json"])).toThrow(/needs --text or --file/);
  });
});

describe("runCli", () => {
  test("summary prints JSON stats", async () => {
    const io = testIo();
    const code = await runCli(["summary", "--text", "hello world hello"], io);
    expect(code).toBe(0);
    expect(JSON.parse(io.outLines[0])).toMatchObject({ words: 3 });
  });

  test("summary reads a file when asked", async () => {
    const io = testIo();
    const code = await runCli(["summary", "--file", "note.txt"], io);
    expect(code).toBe(0);
    expect(JSON.parse(io.outLines[0])).toMatchObject({ words: 1 });
  });

  test("dispatch dry run prints a preview", async () => {
    const io = testIo();
    const code = await runCli(["dispatch", "--text", "hi", "--dry-run"], io);
    expect(code).toBe(0);
    expect(JSON.parse(io.outLines[0])).toMatchObject({ dryRun: true, chars: 2 });
  });

  test("bad usage exits 2", async () => {
    const io = testIo();
    const code = await runCli(["bogus"], io);
    expect(code).toBe(2);
    expect(io.errLines.length).toBeGreaterThan(0);
  });

  test("version prints a version string", async () => {
    const io = testIo();
    const code = await runCli(["--version"], io);
    expect(code).toBe(0);
    expect(io.outLines[0]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("kit validates a kit file", async () => {
    const kit = {
      voice: { maxChars: 100 },
      look: { colors: { primary: "#000000", background: "#ffffff" } },
      templates: [{ name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } }],
    };
    const io = testIo({
      readFile: (path) => (path === "kit.json" ? JSON.stringify(kit) : `file:${path}`),
    });
    const code = await runCli(["kit", "--file", "kit.json"], io);
    expect(code).toBe(0);
    const result = JSON.parse(io.outLines[0]);
    expect(result.valid).toBe(true);
  });

  test("render renders a template", async () => {
    const kit = {
      voice: {},
      look: { colors: { primary: "#000000" } },
      templates: [{ name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } }],
    };
    const io = testIo({
      readFile: (path) => (path === "kit.json" ? JSON.stringify(kit) : `file:${path}`),
    });
    const code = await runCli(
      ["render", "--kit", "kit.json", "--template", "greeting", "--slots", '{"name":"world"}'],
      io,
    );
    expect(code).toBe(0);
    expect(JSON.parse(io.outLines[0])).toEqual({ rendered: "Hello world" });
  });

  test("voice checks text", async () => {
    const kit = {
      voice: { bannedPhrases: ["old term"], maxChars: 50 },
      look: { colors: { primary: "#000000" } },
      templates: [],
    };
    const io = testIo({
      readFile: (path) => (path === "kit.json" ? JSON.stringify(kit) : `file:${path}`),
    });
    const code = await runCli(["voice", "--kit", "kit.json", "--text", "hello world"], io);
    expect(code).toBe(0);
    expect(JSON.parse(io.outLines[0])).toEqual({ issues: [] });
  });

  test("voice reports banned phrase", async () => {
    const kit = {
      voice: { bannedPhrases: ["old term"], maxChars: 50 },
      look: { colors: { primary: "#000000" } },
      templates: [],
    };
    const io = testIo({
      readFile: (path) => (path === "kit.json" ? JSON.stringify(kit) : `file:${path}`),
    });
    const code = await runCli(["voice", "--kit", "kit.json", "--text", "use old term"], io);
    expect(code).toBe(0);
    const result = JSON.parse(io.outLines[0]);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].code).toBe("VOICE_BANNED_PHRASE");
  });
});
