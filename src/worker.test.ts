import { describe, expect, test } from "vitest";
import worker from "./worker.js";

describe("worker", () => {
  test("GET /health reports ok", async () => {
    const response = await worker.fetch(new Request("https://pack.test/health"), {
      PACK_NAME: "probe",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, pack: "probe" });
  });

  test("POST /summarize returns stats", async () => {
    const response = await worker.fetch(
      new Request("https://pack.test/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "one two two" }),
      }),
      {},
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ words: 3 });
  });

  test("POST /summarize rejects a bad body", async () => {
    const response = await worker.fetch(
      new Request("https://pack.test/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: 42 }),
      }),
      {},
    );
    expect(response.status).toBe(400);
  });

  test("POST /render renders a template", async () => {
    const kit = {
      voice: {},
      look: { colors: { primary: "#000000" } },
      templates: [{ name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } }],
    };
    const response = await worker.fetch(
      new Request("https://pack.test/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kitJson: JSON.stringify(kit),
          templateName: "greeting",
          slots: { name: "world" },
        }),
      }),
      {},
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ rendered: "Hello world" });
  });

  test("POST /render rejects a bad body", async () => {
    const response = await worker.fetch(
      new Request("https://pack.test/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kitJson: 123 }),
      }),
      {},
    );
    expect(response.status).toBe(400);
  });

  test("unknown routes return 404", async () => {
    const response = await worker.fetch(new Request("https://pack.test/nowhere"), {});
    expect(response.status).toBe(404);
  });
});
