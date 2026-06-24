import { NextResponse } from "next/server";
import {
  getHexagramRecord,
  resolveLocaleText,
  HexagramTextNotFoundError,
  MissingHexagramTextError,
} from "../../../lib/db/hexagrams";
import type { Locale } from "../../../lib/interpretation/types";

/**
 * GET /api/hexagram?n=<1-64>&locale=<vi|zh|en>
 *
 * Returns the verified corpus text used by the reading screen's structural
 * summary cards: the judgment (Quẻ Từ) and the image/象 (Ý Nghĩa). Server-side
 * only, so the 250KB demo corpus never reaches the client bundle.
 *
 * Never invents content (AGENTS.md §2): a field with no verified text for this
 * locale comes back as null and the card is simply omitted — never guessed. A
 * hexagram with no corpus entry at all is a 404.
 */
function isLocale(value: string | null): value is Locale {
  return value === "vi" || value === "zh" || value === "en";
}

/** Resolve a localized field to a string, or null if there's no verified text. */
function optionalText(
  field: { vi: string | null; zh: string | null; en: string | null },
  locale: Locale,
  context: string,
): string | null {
  try {
    return resolveLocaleText(field, locale, context);
  } catch (err) {
    if (err instanceof MissingHexagramTextError) return null;
    throw err;
  }
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const n = Number(url.searchParams.get("n"));
  const locale = url.searchParams.get("locale");

  if (!Number.isInteger(n) || n < 1 || n > 64) {
    return NextResponse.json({ error: "n must be an integer 1-64" }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "locale must be vi, zh or en" }, { status: 400 });
  }

  try {
    const record = getHexagramRecord(n);
    return NextResponse.json({
      number: record.number,
      judgment: optionalText(record.judgment, locale, `hexagram ${n} judgment`),
      image: optionalText(record.image, locale, `hexagram ${n} image`),
    });
  } catch (err) {
    if (err instanceof HexagramTextNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
