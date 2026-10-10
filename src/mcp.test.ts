import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";
import { createMcpServer } from "./mcp.js";

function textOf(result: unknown): string {
  const content = (result as { content: { type: string; text: string }[] }).content;
  return content[0].text;
}

describe("mcp server", () => {
  test("serves six tools over a client link", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);
    const client = new Client({ name: "probe", version: "0.0.0" });
    await client.connect(clientTransport);
    try {
      const tools = await client.listTools();
      const names = tools.tools.map((tool) => tool.name).sort();
      expect(names).toEqual([
        "check_voice",
        "dispatch_text",
        "get_cost_report",
        "render_template",
        "summarize_text",
        "validate_brand_kit",
      ]);

      const summary = await client.callTool({
        name: "summarize_text",
        arguments: { text: "a b a" },
      });
      expect(JSON.parse(textOf(summary))).toMatchObject({ words: 3 });

      const preview = await client.callTool({
        name: "dispatch_text",
        arguments: { text: "hi", dryRun: true },
      });
      expect(JSON.parse(textOf(preview))).toMatchObject({ dryRun: true });

      const report = await client.callTool({ name: "get_cost_report", arguments: {} });
      expect(JSON.parse(textOf(report))).toHaveProperty("dispatches");
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("a blocked dispatch returns a tool error, not a crash", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const { createGuards } = await import("./core.js");
    const server = createMcpServer({ guards: createGuards({ blocklist: ["nope"] }) });
    await server.connect(serverTransport);
    const client = new Client({ name: "probe", version: "0.0.0" });
    await client.connect(clientTransport);
    try {
      const result = await client.callTool({
        name: "dispatch_text",
        arguments: { text: "nope" },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
      expect(textOf(result)).toContain("blocklisted");
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("validate_brand_kit returns issues for low contrast", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);
    const client = new Client({ name: "probe", version: "0.0.0" });
    await client.connect(clientTransport);
    try {
      const kit = {
        voice: {},
        look: { colors: { fg: "#777777", bg: "#888888" } },
        templates: [],
      };
      const result = await client.callTool({
        name: "validate_brand_kit",
        arguments: { kitJson: JSON.stringify(kit) },
      });
      const parsed = JSON.parse(textOf(result));
      expect(parsed.valid).toBe(false);
      expect(parsed.issues.some((i: { code: string }) => i.code === "LOOK_CONTRAST_AA")).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("render_template fills slots", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);
    const client = new Client({ name: "probe", version: "0.0.0" });
    await client.connect(clientTransport);
    try {
      const kit = {
        voice: {},
        look: { colors: { primary: "#000000" } },
        templates: [{ name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } }],
      };
      const result = await client.callTool({
        name: "render_template",
        arguments: {
          kitJson: JSON.stringify(kit),
          templateName: "greeting",
          slots: { name: "world" },
        },
      });
      expect(JSON.parse(textOf(result))).toEqual({ rendered: "Hello world" });
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("check_voice flags banned phrase", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);
    const client = new Client({ name: "probe", version: "0.0.0" });
    await client.connect(clientTransport);
    try {
      const kit = {
        voice: { bannedPhrases: ["legacy"], maxChars: 100 },
        look: { colors: { primary: "#000000" } },
        templates: [],
      };
      const result = await client.callTool({
        name: "check_voice",
        arguments: { kitJson: JSON.stringify(kit), text: "use legacy word" },
      });
      const parsed = JSON.parse(textOf(result));
      expect(parsed.issues.length).toBeGreaterThan(0);
      expect(parsed.issues[0].code).toBe("VOICE_BANNED_PHRASE");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
