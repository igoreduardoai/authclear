import { humanizeTimestamps } from "./formatTime";

const LETTER_STYLE = `<style>
    body { margin: 0; padding: 32px; background: #F7F9FB; color: #0F1B2D; font-family: "Atkinson Hyperlegible Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 17px; line-height: 1.6; }
    h1 { margin: 0 0 8px; font-size: 40px; line-height: 1.1; font-weight: 700; letter-spacing: -0.02em; }
    h2 { margin: 32px 0 8px; font-size: 24px; line-height: 1.25; font-weight: 600; }
    p { margin: 0 0 12px; max-width: 65ch; }
    a { color: #0F6B6B; }
  </style>`;

/** Add the app tokens to a downloaded member letter and spell dates in words. */
export function withLetterStyles(html: string): string {
  const lang = html.includes('lang="es"') ? "es" : "en";
  const styled = html.includes("</head>") ? html.replace("</head>", `${LETTER_STYLE}</head>`) : `${LETTER_STYLE}${html}`;
  return humanizeTimestamps(styled, lang);
}
