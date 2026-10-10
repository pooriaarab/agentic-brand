import { describe, expect, test } from "vitest";
import {
  BrandError,
  brandKitFromJson,
  brandKitToJson,
  checkVoice,
  contrastRatio,
  defineBrandKit,
  defineLook,
  defineTemplate,
  defineVoice,
  renderTemplate,
  validateBrandKit,
  validateLook,
} from "./brand.js";

describe("defineVoice", () => {
  test("accepts a valid voice", () => {
    const voice = defineVoice({ tone: ["friendly"], maxChars: 100, bannedPhrases: ["bad"] });
    expect(voice.tone).toEqual(["friendly"]);
    expect(voice.maxChars).toBe(100);
  });

  test("throws BrandError for invalid config", () => {
    expect(() => defineVoice({ maxChars: -1 })).toThrow(BrandError);
  });
});

describe("checkVoice", () => {
  test("returns empty issues for clean text", () => {
    const voice = defineVoice({ maxChars: 100, bannedPhrases: [] });
    expect(checkVoice("hello world", voice)).toEqual([]);
  });

  test("flags text that exceeds maxChars", () => {
    const voice = defineVoice({ maxChars: 5 });
    const issues = checkVoice("hello world", voice);
    expect(issues[0]?.code).toBe("VOICE_TOO_LONG");
  });

  test("flags banned phrases case-insensitively", () => {
    const voice = defineVoice({ bannedPhrases: ["SeCrEt", "old term"] });
    const issues = checkVoice("this contains a secret", voice);
    expect(issues.length).toBe(1);
    expect(issues[0]?.code).toBe("VOICE_BANNED_PHRASE");
    expect(issues[0]?.message).toMatch(/secret/i);
  });

  test("flags missing tone tags", () => {
    const voice = defineVoice({ tone: ["friendly", "professional"] });
    const issues = checkVoice("this is neither", voice);
    expect(issues[0]?.code).toBe("VOICE_TONE_MISSING");
  });
});

describe("contrastRatio", () => {
  test("returns exact known values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 2);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("defineLook", () => {
  test("accepts a valid look", () => {
    const look = defineLook({
      colors: { primary: "#000", background: "#fff" },
      pairs: [["primary", "background"]],
    });
    expect(Object.keys(look.colors)).toEqual(["primary", "background"]);
  });

  test("throws for invalid hex", () => {
    expect(() => defineLook({ colors: { primary: "red" } })).toThrow(BrandError);
  });

  test("throws for unknown pair color", () => {
    expect(() =>
      defineLook({
        colors: { primary: "#000" },
        pairs: [["primary", "missing"]],
      }),
    ).toThrow(BrandError);
  });
});

describe("validateLook", () => {
  test("passes black on white", () => {
    const look = defineLook({ colors: { fg: "#000000", bg: "#ffffff" } });
    expect(validateLook(look)).toEqual([]);
  });

  test("reports low contrast below AA", () => {
    const look = defineLook({ colors: { fg: "#777777", bg: "#888888" } });
    const issues = validateLook(look);
    expect(issues.some((i) => i.code === "LOOK_CONTRAST_AA")).toBe(true);
  });

  test("reports AAA failure when threshold is configured", () => {
    const look = defineLook({
      colors: { fg: "#666666", bg: "#ffffff" },
      thresholds: { aa: 4.5, aaa: 7 },
    });
    const issues = validateLook(look);
    expect(issues.some((i) => i.code === "LOOK_CONTRAST_AAA")).toBe(true);
  });
});

describe("defineTemplate", () => {
  test("accepts a valid template", () => {
    const template = defineTemplate({
      name: "greeting",
      body: "Hello {{name}}",
      slots: { name: { required: true } },
    });
    expect(template.name).toBe("greeting");
  });

  test("throws for empty body", () => {
    expect(() => defineTemplate({ name: "empty", body: "" })).toThrow(BrandError);
  });
});

describe("renderTemplate", () => {
  test("fills slots", () => {
    const template = defineTemplate({
      name: "greeting",
      body: "Hello {{name}}, welcome to {{place}}",
      slots: { name: { required: true }, place: { default: "here" } },
    });
    expect(renderTemplate(template, { name: "world" })).toBe("Hello world, welcome to here");
  });

  test("throws for missing required slot", () => {
    const template = defineTemplate({
      name: "greeting",
      body: "Hello {{name}}",
      slots: { name: { required: true } },
    });
    expect(() => renderTemplate(template, {})).toThrow(BrandError);
  });

  test("throws for unknown slot", () => {
    const template = defineTemplate({
      name: "greeting",
      body: "Hello",
      slots: {},
    });
    expect(() => renderTemplate(template, { unknown: "x" })).toThrow(/unknown slot/);
  });

  test("throws for pattern mismatch", () => {
    const template = defineTemplate({
      name: "greeting",
      body: "Hello {{name}}",
      slots: { name: { required: true, pattern: "[A-Z]+" } },
    });
    expect(() => renderTemplate(template, { name: "lowercase" })).toThrow(/pattern/);
  });

  test("throws for slot used in body but not defined", () => {
    const template = defineTemplate({
      name: "greeting",
      body: "Hello {{name}}",
      slots: {},
    });
    expect(() => renderTemplate(template, {})).toThrow(/unknown slot/);
  });
});

describe("defineBrandKit", () => {
  test("accepts a valid kit", () => {
    const kit = defineBrandKit({
      voice: { maxChars: 100 },
      look: { colors: { primary: "#000", background: "#fff" } },
      templates: [{ name: "greeting", body: "Hello {{name}}", slots: { name: { required: true } } }],
    });
    expect(kit.voice.maxChars).toBe(100);
  });

  test("throws BrandError for invalid kit", () => {
    expect(() => defineBrandKit({ voice: {}, look: { colors: {} } })).toThrow(BrandError);
  });
});

describe("brand kit JSON round trip", () => {
  test("serializes and parses back", () => {
    const kit = defineBrandKit({
      voice: { tone: ["friendly"], maxChars: 100 },
      look: { colors: { primary: "#000000" } },
      templates: [{ name: "greeting", body: "Hi {{name}}", slots: { name: { default: "friend" } } }],
    });
    const json = brandKitToJson(kit);
    const parsed = brandKitFromJson(json);
    expect(parsed.voice.tone).toEqual(["friendly"]);
    expect(parsed.look.colors.primary).toBe("#000000");
    expect(parsed.templates[0]?.body).toBe("Hi {{name}}");
  });

  test("rejects invalid JSON", () => {
    expect(() => brandKitFromJson("not json")).toThrow(BrandError);
  });

  test("rejects invalid kit", () => {
    expect(() => brandKitFromJson('{"voice":{},"look":{"colors":{}},"templates":[]}')).toThrow(
      BrandError,
    );
  });
});

describe("validateBrandKit", () => {
  test("returns contrast issues", () => {
    const kit = defineBrandKit({
      voice: {},
      look: { colors: { fg: "#777777", bg: "#888888" } },
      templates: [],
    });
    const issues = validateBrandKit(kit);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.type).toBe("look");
  });
});
