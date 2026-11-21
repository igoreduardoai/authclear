import { describe, expect, it } from "vitest";
import { fernandezHuerta, fleschKincaidGrade, spanishSyllables } from "../src/lib/readability";

describe("Spanish readability", () => {
  it("counts syllables for a hand-checked word list", () => {
    const counts: Record<string, number> = {
      La: 1,
      casa: 2,
      grande: 2,
      del: 1,
      niño: 2,
      tiene: 2,
      una: 2,
      puerta: 2,
      roja: 2,
      y: 1,
      ventana: 3,
      blanca: 2,
      hoy: 1,
      autorización: 5,
      día: 2,
      código: 3,
      solicitud: 4,
      decisión: 3,
      acción: 2,
      guía: 2,
    };
    for (const [word, syllables] of Object.entries(counts)) {
      expect(spanishSyllables(word), word).toBe(syllables);
    }
  });

  it("applies the Fernández-Huerta coefficients", () => {
    const text = "La casa grande del niño tiene una puerta roja y una ventana blanca hoy.";
    const score = fernandezHuerta(text);
    expect(score).not.toBeNull();
    expect(score?.formula).toBe("fernandez-huerta");
    expect(score?.words).toBe(14);
    expect(score?.sentences).toBe(1);
    expect(score?.syllables).toBe(25);
    const index = 206.84 - 0.6 * (25 / 14) * 100 - 1.02 * (1 / 14) * 100;
    expect(score?.index).toBe(Math.round(index * 10) / 10);
  });

  it("does not score a five-word reason string", () => {
    expect(fleschKincaidGrade("Example documentation was not attached")).toBeNull();
    expect(fernandezHuerta("Motivo corto de ejemplo.")).toBeNull();
  });
});
