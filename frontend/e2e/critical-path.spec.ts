import { expect, test, type Page } from "@playwright/test";

import { toParisInputValue } from "../lib/dates";

/** The mandatory manual test path of the specification, automated. */

const PASSWORD = "motdepasse-solide";
const inDays = (days: number, hour = 18) => {
  const date = new Date(Date.now() + days * 86_400_000);
  return `${toParisInputValue(date.toISOString()).slice(0, 11)}${String(hour).padStart(2, "0")}:00`;
};

/**
 * Next.js keeps previously visited pages mounted but hidden (React <Activity>),
 * so text lookups must target visible elements only.
 */
const seen = (page: Page, text: string) => page.getByText(text).filter({ visible: true }).first();

/** Dashboard list filter chips ("À venir", "Examens"…). */
const chip = (page: Page, name: string) =>
  page.getByRole("radio", { name: new RegExp(`^${name}`) }).click();

async function openProfile(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole("button", { name: "Menu du compte" }).click();
    await page.getByRole("menuitem", { name: "Mon profil" }).click();
  } else {
    await navigate(page, "Profil");
  }
  await expect(page).toHaveURL(/\/profile$/);
}

async function register(page: Page, firstName: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Prénom").fill(firstName);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Menu du compte" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name })
    .click();
}

test("critical path: account, profile, subject, assignment, exam, dashboard, isolation", async ({
  page,
  browser,
}, testInfo) => {
  const suffix = `${Date.now()}-${testInfo.project.name}`;
  const emailA = `alice-${suffix}@telecomnancy.eu`;
  const mobile = testInfo.project.name === "mobile";

  // 1. A new student creates an account (lands on the dashboard, empty states).
  await register(page, "Alice", emailA);
  await expect(
    page.getByRole("heading", { name: "Bonjour Alice" }).filter({ visible: true }),
  ).toBeVisible();
  await expect(seen(page, "Commence par ajouter ta première matière")).toBeVisible();
  await expect(seen(page, "Aucun devoir à venir")).toBeVisible();
  await chip(page, "Examens");
  await expect(seen(page, "Aucun examen enregistré")).toBeVisible();

  // 2. Logs out and back in (wrong password first).
  await logout(page);
  await page.getByLabel("Adresse e-mail").fill(emailA);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(seen(page, "E-mail ou mot de passe incorrect.")).toBeVisible();
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // 3. Completes the profile.
  await openProfile(page, mobile);
  await page.getByLabel("Promotion").fill("2027");
  await page.getByLabel("Année d'études").selectOption("2");
  await page.getByLabel("Groupe de TD").fill("TD2");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(seen(page, "Profil enregistré")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Promotion")).toHaveValue("2027");

  // 4. Creates a subject (and gets a validation error first).
  await navigate(page, "Matières");
  await page.getByRole("button", { name: "Nouvelle matière" }).click();
  const subjectDialog = page.getByRole("dialog");
  await subjectDialog.getByRole("button", { name: "Créer la matière" }).click();
  await expect(subjectDialog.getByText("Donne un nom à la matière.")).toBeVisible();
  await subjectDialog.getByLabel("Nom").fill("Réseaux");
  await subjectDialog.getByRole("button", { name: "Créer la matière" }).click();
  await expect(seen(page, "Matière créée")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Réseaux" }).filter({ visible: true }),
  ).toBeVisible();

  // 5. Creates an assignment linked to this subject.
  await navigate(page, "Devoirs");
  await page.getByRole("button", { name: "Nouveau devoir" }).click();
  const assignmentDialog = page.getByRole("dialog");
  await assignmentDialog.getByLabel("Titre").fill("TP sockets");
  await assignmentDialog.getByLabel("Date limite").fill(inDays(2));
  await assignmentDialog.getByLabel("Matière").selectOption({ label: "Réseaux" });
  await assignmentDialog.getByLabel("Priorité").selectOption("high");
  await assignmentDialog.getByRole("button", { name: "Ajouter le devoir" }).click();
  await expect(seen(page, "Devoir ajouté")).toBeVisible();
  await expect(seen(page, "TP sockets")).toBeVisible();

  // 6. Creates an exam.
  await navigate(page, "Examens");
  await page.getByRole("button", { name: "Nouvel examen" }).click();
  const examDialog = page.getByRole("dialog");
  await examDialog.getByLabel("Titre").fill("Partiel réseaux");
  await examDialog.getByLabel("Date et heure").fill(inDays(5, 9));
  await examDialog.getByLabel("Matière").selectOption({ label: "Réseaux" });
  await examDialog.getByLabel("Salle").fill("Amphi Nord");
  await examDialog.getByRole("button", { name: "Ajouter l'examen" }).click();
  await expect(seen(page, "Examen ajouté")).toBeVisible();
  await expect(seen(page, "Partiel réseaux")).toBeVisible();

  // 7. Finds them on the dashboard.
  await navigate(page, "Accueil");
  await expect(seen(page, "TP sockets")).toBeVisible();
  await chip(page, "Examens");
  await expect(seen(page, "Partiel réseaux")).toBeVisible();
  await expect(seen(page, "Amphi Nord")).toBeVisible();
  await chip(page, "À venir");

  // 8. Changes the assignment status: done items leave the upcoming list.
  await page.getByRole("button", { name: "Marquer « TP sockets » terminé" }).click();
  await expect(seen(page, "Bravo, devoir terminé !")).toBeVisible();
  await expect(seen(page, "Aucun devoir à venir")).toBeVisible();

  // 9. Edits an exam, then deletes the assignment (with confirmation).
  await chip(page, "Examens");
  await page.getByRole("button", { name: "Actions pour Partiel réseaux" }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await page.getByRole("dialog").getByLabel("Salle").fill("Salle 2.12");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(seen(page, "Salle 2.12")).toBeVisible();

  await navigate(page, "Devoirs");
  await page.getByRole("button", { name: "Actions pour TP sockets" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(seen(page, "Devoir supprimé")).toBeVisible();
  await expect(seen(page, "Aucun devoir pour l'instant")).toBeVisible();

  const examsResponse = await page.request.get("/api/v1/exams");
  const examId: string = (await examsResponse.json()).items[0].id;

  // 10. Logs out. 11. Private pages are no longer reachable.
  await logout(page);
  for (const path of ["/dashboard", "/subjects", "/assignments", "/exams", "/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);

  // 12. Another account cannot see or reach the first one's data.
  const other = await browser.newContext();
  const pageB = await other.newPage();
  await register(pageB, "Bob", `bob-${suffix}@telecomnancy.eu`);
  await chip(pageB, "Examens");
  await expect(seen(pageB, "Aucun examen enregistré")).toBeVisible();
  await expect(pageB.getByText("Partiel réseaux").filter({ visible: true })).toHaveCount(0);
  expect((await pageB.request.get(`/api/v1/exams/${examId}`)).status()).toBe(404);
  expect((await pageB.request.delete(`/api/v1/exams/${examId}`)).status()).toBe(404);
  await other.close();
});
