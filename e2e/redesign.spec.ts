import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("first screen hides FHIR paths and keeps the letter download in view", async ({ page }) => {
  mkdirSync("docs/screens", { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "AuthClear" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Not Certified" })).toBeVisible();
  await expect(page.getByText("Your plan did not approve this request.")).toBeVisible();
  await expect(page.getByText(/entry\[\d+\]\.resource/)).toHaveCount(0);
  await expect(page.locator(".json")).toHaveCount(0);
  await page.screenshot({ path: "docs/screens/after-1280x800.png" });

  await page.getByRole("button", { name: "Show source" }).first().click();
  await expect(page.getByText(/entry\[\d+\]\.resource/).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/entry\[\d+\]\.resource/)).toHaveCount(0);

  const own = page.locator("aside");
  await own.locator("summary").click();
  await own.getByLabel("Paste FHIR JSON").fill("{");
  await own.getByRole("button", { name: "Paste FHIR JSON" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Cannot read" })).toBeVisible();
  await page.getByRole("tab", { name: "Denied" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Not Certified" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const letter = page.getByRole("button", { name: "Download member letter" });
  await expect(letter).toBeVisible();
  const box = await letter.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "docs/screens/after-390x844.png" });
});
