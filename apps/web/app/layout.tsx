import type { Metadata } from "next";
import "./globals.css";

const title = "Hoodwire — the financial routing layer for AI agents";
const description =
  "One MCP connection. Every financial service on Robinhood Chain. Routed, paid in USDG, settled in under a second.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.hoodwire.xyz"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://www.hoodwire.xyz",
    siteName: "Hoodwire",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: "@hoodwirexyz",
    creator: "@hoodwirexyz",
  },
  other: {
    "ory-verify": "orynth-a2a5f13578a440799d4c315f462d9465",
    "virtual-protocol-site-verification": "a6292b2660f5fa02619c52661b779c17",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* loaded via <link> (not next/font) so builds never fail offline; falls back to system fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
