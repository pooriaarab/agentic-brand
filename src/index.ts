export { VERSION } from "./version.js";
export {
  defineBrand,
  createLogger,
  GuardError,
  VendorError,
  createGuards,
  LocalRouterAdapter,
  HttpRouterAdapter,
  recordCost,
  getCostReport,
  resetCosts,
  createDryRunResult,
  dispatchText,
  summarizeText,
} from "./core.js";
export type {
  BrandConfig,
  LogLevel,
  Logger,
  LoggerOptions,
  CapsConfig,
  QuietHoursConfig,
  GuardsConfig,
  Guards,
  DispatchReceipt,
  RouterAdapter,
  HttpRouterOptions,
  CostEntry,
  CostReport,
  DispatchOptions,
  DispatchResult,
  TopWord,
  TextSummary,
  SummarizeOptions,
} from "./core.js";
export {
  BrandError,
  defineVoice,
  checkVoice,
  defineLook,
  validateLook,
  contrastRatio,
  defineTemplate,
  renderTemplate,
  defineBrandKit,
  validateBrandKit,
  brandKitToJson,
  brandKitFromJson,
  voiceConfigSchema,
  lookConfigSchema,
  slotDefSchema,
  templateConfigSchema,
  brandKitSchema,
} from "./brand.js";
export type {
  BrandIssue,
  BrandIssueType,
  VoiceConfig,
  LookConfig,
  SlotDef,
  TemplateConfig,
  BrandKit,
} from "./brand.js";

import { defineBrand, type BrandConfig } from "./core.js";
import { VERSION } from "./version.js";

export const DEFAULT_BRAND: BrandConfig = defineBrand({
  name: "Agentic brand",
  command: "agentic-brand",
  description: "Brand-kit validator for voice, look, and templates.",
  keywords: ["brand-kit", "voice", "templates", "agentic-suite", "claude-code", "codex", "cli", "mcp"],
  version: VERSION,
});
