import readability from "text-readability";

/** Flesch-Kincaid grade from the text-readability package. Short notices can swing the score. */
export function fleschKincaidGrade(text: string): number | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 12) return null;
  const grade = readability.fleschKincaidGrade(text);
  return Number.isFinite(grade) ? round1(grade) : null;
}

export interface FernandezHuertaScore {
  formula: "fernandez-huerta";
  index: number;
  words: number;
  sentences: number;
  syllables: number;
}

/**
 * Fernández-Huerta index: 206.84 − 0.60×(syllables per 100 words) − 1.02×(sentences per 100 words).
 * This is an ease index, not a U.S. grade. Syllables come from spanishSyllables() in this file.
 * Returns null below 12 words, the same cutoff as fleschKincaidGrade.
 */
export function fernandezHuerta(text: string): FernandezHuertaScore | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 12) return null;
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((part) => part.trim()).length);
  const syllables = words.reduce((sum, word) => sum + spanishSyllables(word), 0);
  const perHundred = 100 / words.length;
  const index = 206.84 - 0.6 * syllables * perHundred - 1.02 * sentences * perHundred;
  return {
    formula: "fernandez-huerta",
    index: round1(index),
    words: words.length,
    sentences,
    syllables,
  };
}

const STRONG = new Set(["a", "e", "o", "á", "é", "ó"]);
const WEAK = new Set(["i", "u", "ü"]);
const WEAK_ACCENT = new Set(["í", "ú"]);

/** Deterministic Spanish syllable count. Accented í/ú and adjacent strong vowels split. A token with no vowel counts as 1. */
export function spanishSyllables(word: string): number {
  const prepared = word
    .toLowerCase()
    .normalize("NFC")
    .replace(/qu([eiéí])/g, "q$1")
    .replace(/gu([eiéí])/g, "g$1");
  const letters = [...prepared].filter((character) => /[a-záéíóúüñ]/.test(character));
  if (letters.length === 0) return 1;
  const groups: string[][] = [];
  let current: string[] = [];
  for (const character of letters) {
    if (isVowel(character)) current.push(character);
    else if (current.length > 0) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  if (groups.length === 0) return 1;
  return groups.reduce((sum, group) => sum + vowelGroupSyllables(group), 0);
}

function isVowel(character: string): boolean {
  return STRONG.has(character) || WEAK.has(character) || WEAK_ACCENT.has(character);
}

function vowelGroupSyllables(group: string[]): number {
  let syllables = 1;
  for (let index = 1; index < group.length; index += 1) {
    const previous = group[index - 1] ?? "";
    const current = group[index] ?? "";
    const hiatus = WEAK_ACCENT.has(previous) || WEAK_ACCENT.has(current) || (STRONG.has(previous) && STRONG.has(current));
    if (hiatus) syllables += 1;
  }
  return syllables;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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
