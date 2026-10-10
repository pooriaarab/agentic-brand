import { summarizeText } from "./core.js";
import { brandKitFromJson, renderTemplate, validateBrandKit } from "./brand.js";
import { VERSION } from "./version.js";

export interface WorkerEnv {
  PACK_NAME?: string;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        pack: env.PACK_NAME ?? "agentic-brand",
        version: VERSION,
      });
    }
    if (request.method === "POST" && url.pathname === "/summarize") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "body must be JSON" }, 400);
      }
      if (typeof body !== "object" || body === null || !("text" in body)) {
        return json({ error: "body needs a text string" }, 400);
      }
      const { text } = body as { text: unknown };
      if (typeof text !== "string") {
        return json({ error: "body needs a text string" }, 400);
      }
      return json(summarizeText(text));
    }
    if (request.method === "POST" && url.pathname === "/render") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "body must be JSON" }, 400);
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("kitJson" in body) ||
        !("templateName" in body) ||
        !("slots" in body)
      ) {
        return json({ error: "body needs kitJson, templateName, and slots" }, 400);
      }
      const { kitJson, templateName, slots } = body as {
        kitJson: unknown;
        templateName: unknown;
        slots: unknown;
      };
      if (
        typeof kitJson !== "string" ||
        typeof templateName !== "string" ||
        typeof slots !== "object" ||
        slots === null ||
        Array.isArray(slots)
      ) {
        return json({ error: "kitJson and templateName must be strings and slots an object" }, 400);
      }
      try {
        const kit = brandKitFromJson(kitJson);
        const template = kit.templates.find((t) => t.name === templateName);
        if (template === undefined) {
          return json({ error: `template "${templateName}" not found` }, 400);
        }
        const issues = validateBrandKit(kit);
        const rendered = renderTemplate(template, slots as Record<string, string>);
        return json({ rendered, issues });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return json({ error: message }, 400);
      }
    }
    return json({ error: "not found" }, 404);
  },
};
