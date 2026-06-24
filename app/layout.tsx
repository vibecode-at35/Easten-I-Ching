import type { Metadata } from "next";
import { Inter, Noto_Serif, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "../lib/i18n/LocaleProvider";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

/**
 * Warm-traditional type system (docs/TASKS/milestone-3-reading-experience.md §5.3):
 * serif for content (the reading, hexagram names — the corpus uses traditional
 * Chinese), sans for chrome (buttons, small labels). Loaded via next/font so
 * they're self-hosted at build time, no runtime requests to Google Fonts.
 */
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const notoSerifTC = Noto_Serif_TC({
  // next/font's subset list for this family covers non-CJK add-ons only —
  // full Traditional Chinese glyph coverage is inherent to the family itself.
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-tc",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "易經 — AI I Ching Consultation",
  description: "A grounded, reflective I Ching reading for your real question.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${notoSerif.variable} ${notoSerifTC.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        <LocaleProvider>
          <LanguageSwitcher />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
