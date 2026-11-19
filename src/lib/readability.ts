import readability from "text-readability";

/** Flesch-Kincaid grade from the text-readability package. Short notices can swing the score. */
export function fleschKincaidGrade(text: string): number | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 12) return null;
  const grade = readability.fleschKincaidGrade(text);
  return Number.isFinite(grade) ? grade : null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
