# Research notes

These notes come from sources fetched with `curl` while building `agentic-brand`.
They shaped the template slot syntax, the Zod schemas, the WCAG contrast math,
and the DTCG-style brand token format used by this pack.

## Mustache slots

Source: https://mustache.github.io/mustache.5.html (fetched 2026-01-12)

The Mustache manual defines logic-less templates. The key tag type for this pack
is the variable tag `{{name}}`:

> The most basic tag type is the variable. A `{{name}}` tag in a basic template
> will try to find the `name` key in the current context. ... If the top context
> is reached and the `name` key is still not found, nothing will be rendered.

The manual also states that unknown variable misses render as an empty string by
default, but implementations can be configured to raise an exception. For brand
templates the brand module throws on missing required slots so that invalid kits
fail fast instead of silently producing bad output.

## Zod schema validation

Source: https://zod.dev/ (fetched 2026-01-12)

The Zod intro describes itself as:

> Zod is a TypeScript-first validation library. Using Zod, you can define
> schemas you can use to validate data, from a simple `string` to a complex
> nested object.

Example from the page:

```ts
import * as z from "zod";

const User = z.object({
  name: z.string(),
});

const data = User.parse(input);
console.log(data.name);
```

The brand module uses Zod to parse brand kits from JSON and to give typed,
detailed errors when a kit is malformed.

## WCAG contrast ratio

Source: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
Source: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
(both fetched 2026-01-12)

The WCAG 2.1 spec defines contrast ratio as:

> (L1 + 0.05) / (L2 + 0.05), where L1 is the relative luminance of the lighter
> of the colors, and L2 is the relative luminance of the darker of the colors.

Relative luminance is defined for the sRGB colorspace as:

> L = 0.2126 * R + 0.7152 * G + 0.0722 * B

where R, G, and B are:

> if RsRGB <= 0.04045 then R = RsRGB/12.92
> else R = ((RsRGB+0.055)/1.055) ^ 2.4

with analogous formulas for G and B, and RsRGB, GsRGB, BsRGB defined as the
8-bit components divided by 255.

The look validator in this pack uses this exact sRGB math to compute contrast
and reports pairs that fall below AA thresholds.

## Brand token config / Style Dictionary

Source: https://styledictionary.com/ (fetched 2026-01-12)

Style Dictionary converts design tokens into platform-specific outputs. Its
homepage describes the tool as:

> Export your Design Tokens to any platform - iOS, Android, CSS, JS, HTML,
> sketch files, style documentation, or anything you can think of.
> Forward-compatible with Design Tokens Community Group spec.

The page contains a live DTCG-format token example with grouped color, dimension,
font, transition, border, and shadow tokens. This informed the JSON brand-kit
shape: a top-level object with named voice, look, and template sections so that
generators can read the kit as a portable token-like package.
