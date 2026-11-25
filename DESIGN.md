---
version: alpha
name: AuthClear
description: Plain-language prior-authorization letters for a member or navigator. Light theme only.
colors:
  bg: "#F7F9FB"
  surface: "#FFFFFF"
  ink: "#0F1B2D"
  muted: "#475467"
  line: "#D0D5DD"
  control-border: "#667085"
  primary: "#0F6B6B"
  on-primary: "#FFFFFF"
  focus: "#2563EB"
  denied: "#B42318"
  denied-bg: "#FEF3F2"
  pending: "#93370D"
  pending-bg: "#FFFAEB"
  approved: "#067647"
  approved-bg: "#ECFDF3"
  error: "#5925DC"
  error-bg: "#F4F3FF"
  unknown: "#344054"
  unknown-bg: "#F2F4F7"
typography:
  result-headline:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: "700"
    lineHeight: 1.1
    letterSpacing: -0.02em
  product-name:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 1.3
  section:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 1.25
  card-title:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 1.35
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 17px
    fontWeight: "400"
    lineHeight: 1.6
  meta:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.45
  code:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  control: 8px
  card: 16px
  badge: 999px
spacing:
  unit: 4px
  card-padding: 32px
  section-gap: 48px
components:
  result-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    height: 44px
  source-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
---

# AuthClear

One result card carries the screen: status, the letter headline, one plain sentence, and the next step. Atkinson Hyperlegible Next is the only UI face. Geist Mono appears only in the source sheet. The page background is cool gray, not cream. Teal is the single filled action. Status uses an icon, a word, and the paired tint.
