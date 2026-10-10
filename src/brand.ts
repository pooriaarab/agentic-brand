import { z } from "zod";

export type BrandIssueType = "voice" | "look" | "template" | "kit";

export interface BrandIssue {
  type: BrandIssueType;
  code: string;
  message: string;
  path: string;
}

export class BrandError extends Error {
  readonly code = "BRAND_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "BrandError";
  }
}

export const voiceConfigSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  tone: z.array(z.string()).default([]),
  maxChars: z.number().int().nonnegative().optional(),
  bannedPhrases: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
});

export type VoiceConfig = z.infer<typeof voiceConfigSchema>;

export const lookConfigSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  colors: z.record(z.string()).refine(
    (colors) => Object.keys(colors).length > 0,
    "look must define at least one color",
  ),
  pairs: z.array(z.tuple([z.string(), z.string()])).default([]),
  thresholds: z
    .object({
      aa: z.number().positive().default(4.5),
      aaa: z.number().positive().default(7),
    })
    .default({}),
});

export type LookConfig = z.infer<typeof lookConfigSchema>;

export const slotDefSchema = z.object({
  required: z.boolean().default(false),
  default: z.string().optional(),
  pattern: z.string().optional(),
});

export type SlotDef = z.infer<typeof slotDefSchema>;

export const templateConfigSchema = z.object({
  name: z.string().min(1, "template name must not be empty"),
  description: z.string().optional(),
  body: z.string().min(1, "template body must not be empty"),
  slots: z.record(slotDefSchema).default({}),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;

export const brandKitSchema = z.object({
  voice: voiceConfigSchema,
  look: lookConfigSchema,
  templates: z.array(templateConfigSchema).default([]),
});

export type BrandKit = z.infer<typeof brandKitSchema>;

const HEX_RE = /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function brandIssue(type: BrandIssueType, code: string, message: string, path: string): BrandIssue {
  return { type, code, message, path };
}

export function defineVoice(config: unknown): VoiceConfig {
  const result = voiceConfigSchema.safeParse(config);
  if (!result.success) {
    throw new BrandError(formatZodError(result.error, "voice"));
  }
  return result.data;
}

export function checkVoice(text: string, voice: VoiceConfig): BrandIssue[] {
  const issues: BrandIssue[] = [];
  if (voice.maxChars !== undefined && text.length > voice.maxChars) {
    issues.push(
      brandIssue(
        "voice",
        "VOICE_TOO_LONG",
        `text is ${text.length} chars, max is ${voice.maxChars}`,
        "voice.maxChars",
      ),
    );
  }
  const lowered = text.toLowerCase();
  for (const phrase of voice.bannedPhrases) {
    if (phrase.length > 0 && lowered.includes(phrase.toLowerCase())) {
      issues.push(
        brandIssue(
          "voice",
          "VOICE_BANNED_PHRASE",
          `text contains banned phrase "${phrase}"`,
          "voice.bannedPhrases",
        ),
      );
    }
  }
  if (voice.tone.length > 0) {
    const matched = voice.tone.some((tone) => lowered.includes(tone.toLowerCase()));
    if (!matched) {
      issues.push(
        brandIssue(
          "voice",
          "VOICE_TONE_MISSING",
          `text does not match any tone tag: ${voice.tone.join(", ")}`,
          "voice.tone",
        ),
      );
    }
  }
  return issues;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  let full = clean;
  if (clean.length === 3 || clean.length === 4) {
    full = clean
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const r = Number.parseInt(full.slice(0, 2), 16) / 255;
  const g = Number.parseInt(full.slice(2, 4), 16) / 255;
  const b = Number.parseInt(full.slice(4, 6), 16) / 255;
  return { r, g, b };
}

function gammaCorrect(channel: number): number {
  if (channel <= 0.04045) {
    return channel / 12.92;
  }
  return ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = gammaCorrect(r);
  const G = gammaCorrect(g);
  const B = gammaCorrect(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function defineLook(config: unknown): LookConfig {
  const result = lookConfigSchema.safeParse(config);
  if (!result.success) {
    throw new BrandError(formatZodError(result.error, "look"));
  }
  const look = result.data;
  for (const [key, value] of Object.entries(look.colors)) {
    if (!HEX_RE.test(value)) {
      throw new BrandError(`look color "${key}" is not a valid hex color: "${value}"`);
    }
  }
  for (const [fg, bg] of look.pairs) {
    if (look.colors[fg] === undefined) {
      throw new BrandError(`look pair references unknown foreground color "${fg}"`);
    }
    if (look.colors[bg] === undefined) {
      throw new BrandError(`look pair references unknown background color "${bg}"`);
    }
  }
  return look;
}

export function validateLook(look: LookConfig): BrandIssue[] {
  const issues: BrandIssue[] = [];
  const pairs = look.pairs.length > 0 ? look.pairs : allPairs(Object.keys(look.colors));
  for (const [fg, bg] of pairs) {
    if (fg === bg) continue;
    const ratio = contrastRatio(look.colors[fg] as string, look.colors[bg] as string);
    if (ratio < look.thresholds.aa) {
      issues.push(
        brandIssue(
          "look",
          "LOOK_CONTRAST_AA",
          `contrast between ${fg} and ${bg} is ${ratio.toFixed(2)}:1, below AA threshold ${look.thresholds.aa}:1`,
          `look.colors.${fg}`,
        ),
      );
    } else if (ratio < look.thresholds.aaa) {
      issues.push(
        brandIssue(
          "look",
          "LOOK_CONTRAST_AAA",
          `contrast between ${fg} and ${bg} is ${ratio.toFixed(2)}:1, below AAA threshold ${look.thresholds.aaa}:1`,
          `look.colors.${fg}`,
        ),
      );
    }
  }
  return issues;
}

function allPairs(names: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = 0; j < names.length; j += 1) {
      if (i !== j) pairs.push([names[i] as string, names[j] as string]);
    }
  }
  return pairs;
}

const SLOT_RE = /\{\{(\w+)\}\}/g;

export function defineTemplate(config: unknown): TemplateConfig {
  const result = templateConfigSchema.safeParse(config);
  if (!result.success) {
    throw new BrandError(formatZodError(result.error, "template"));
  }
  return result.data;
}

export function renderTemplate(template: TemplateConfig, values: Record<string, string>): string {
  const bodySlots = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(SLOT_RE.source, SLOT_RE.flags);
  while ((match = re.exec(template.body)) !== null) {
    bodySlots.add(match[1] as string);
  }

  const known = new Set(Object.keys(template.slots));
  for (const name of Object.keys(values)) {
    if (!known.has(name)) {
      throw new BrandError(`unknown slot "${name}"`);
    }
  }

  for (const name of bodySlots) {
    if (!known.has(name)) {
      throw new BrandError(`template body uses unknown slot "${name}"`);
    }
  }

  const resolved: Record<string, string> = {};
  for (const [name, def] of Object.entries(template.slots)) {
    if (values[name] !== undefined) {
      const pattern = def.pattern;
      if (pattern !== undefined && pattern.length > 0) {
        const regex = new RegExp(`^${pattern}$`);
        if (!regex.test(values[name] as string)) {
          throw new BrandError(
            `slot "${name}" value "${values[name]}" does not match pattern /${pattern}/`,
          );
        }
      }
      resolved[name] = values[name] as string;
    } else if (def.default !== undefined) {
      resolved[name] = def.default;
    } else if (def.required) {
      throw new BrandError(`missing required slot "${name}"`);
    }
  }

  return template.body.replace(SLOT_RE, (_full, name: string) => {
    return resolved[name] ?? "";
  });
}

export function defineBrandKit(config: unknown): BrandKit {
  const result = brandKitSchema.safeParse(config);
  if (!result.success) {
    throw new BrandError(formatZodError(result.error, "kit"));
  }
  const kit = result.data;
  defineLook(kit.look);
  for (const template of kit.templates) {
    defineTemplate(template);
  }
  return kit;
}

export function validateBrandKit(kit: BrandKit): BrandIssue[] {
  const issues: BrandIssue[] = [];
  issues.push(...validateLook(kit.look));
  return issues;
}

export function brandKitToJson(kit: BrandKit): string {
  return JSON.stringify(kit, null, 2);
}

export function brandKitFromJson(json: string): BrandKit {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new BrandError(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const result = brandKitSchema.safeParse(parsed);
  if (!result.success) {
    throw new BrandError(formatZodError(result.error, "kit"));
  }
  const kit = result.data;
  defineLook(kit.look);
  for (const template of kit.templates) {
    defineTemplate(template);
  }
  return kit;
}

function formatZodError(error: z.ZodError, pathPrefix: string): string {
  const parts = error.errors.map((e) => `${pathPrefix}${e.path.length > 0 ? "." : ""}${e.path.join(".")}: ${e.message}`);
  return parts.join("; ");
}
