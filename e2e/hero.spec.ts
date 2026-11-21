import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("denied example explains the review action and downloads a Task", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "AuthClear" })).toBeVisible();
  await expect(page.getByText("Synthetic / HL7-published example data — no real members.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Not Certified" })).toBeVisible();
  await expect(page.getByText("Grouped as a denial")).toBeVisible();
  await expect(page.locator("#case-panel")).toContainText("The resource status is active");
  await expect(page.locator("#case-panel")).toContainText("does not include a specific reason");
  await expect(page.locator("#decision")).toContainText("The outcome field is complete");
  await expect(page.getByRole("heading", { level: 3, name: "Next action" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Task JSON" }).click();
  const download = await downloadPromise;
  const task = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(task.resourceType).toBe("Task");
  expect(task.status).toBe("requested");
  expect(task.intent).toBe("order");
  expect(task.focus.reference).toBe("ClaimResponse/RejectionResponseExample");
  expect(task.restriction).toBeUndefined();

  const letterPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download member letter" }).click();
  const letter = await letterPromise;
  const html = readFileSync(await letter.path(), "utf8");
  expect(html).toContain("Not Certified");
  expect(html).toContain("no real members");
  expect(html).not.toContain("Americanas");
});

test("pending, patient access, invalid, and Spanish views stay readable", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: "Pending" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Pending" })).toBeVisible();
  await expect(page.locator("#decision")).toContainText("2005-05-05T11:01:00+05:00");
  await expect(page.locator("#case-panel")).toContainText("referenced Claim example");

  await page.getByRole("tab", { name: "Patient Access" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Certified in total" })).toBeVisible();
  await expect(page.locator("#decision")).toContainText("The outcome field is queued");

  await page.getByRole("tab", { name: "Invalid input" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Cannot read" })).toBeVisible();

  await page.getByRole("tab", { name: "Denied" }).click();
  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.getByText("Agrupado como negativa")).toBeVisible();
  await expect(page.locator("#decision")).toContainText("Not Certified");
  await expect(page.locator("#case-panel")).toContainText("El estado del recurso es active");
  await expect(page.locator("#case-panel")).toContainText("no incluye un motivo específico");
});

test("has no axe violations on desktop or a narrow viewport", async ({ page }) => {
  await page.goto("./");
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Pending" }).click();
  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations).toEqual([]);
});

test("health endpoint is static JSON with no auth", async ({ request }) => {
  const response = await request.get("./health.json");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("authclear");
  expect(body.auth).toBe("none");
});
