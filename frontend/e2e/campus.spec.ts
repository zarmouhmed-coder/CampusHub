import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Multi-role scenario across the institution modules, through the UI.
 * Needs a platform super administrator (see README: `python -m app.cli create-superadmin`),
 * given by E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD.
 */
const OWNER = process.env.E2E_SUPERADMIN_EMAIL;
const OWNER_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD;
const PASSWORD = "motdepasse-solide";

const seen = (page: Page, text: string | RegExp) =>
  page.getByText(text).filter({ visible: true }).first();
const dialog = (page: Page) => page.getByRole("dialog");
const pad = (n: number) => String(n).padStart(2, "0");

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name, exact: true })
    .click();
}

/** Opens an invitation link in a fresh browser context and creates the account. */
async function acceptInvitation(browser: Browser, url: string, firstName: string): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", timezoneId: "Africa/Dakar" });
  const page = await context.newPage();
  await page.goto(url);
  await page.getByLabel("Prénom").fill(firstName);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  return page;
}

async function invite(
  page: Page,
  email: string,
  role: string,
  extra: { cohort?: string; number?: string } = {},
) {
  await page.getByRole("button", { name: "Inviter" }).first().click();
  const d = dialog(page);
  await d.getByLabel("E-mail").fill(email);
  await d.getByLabel("Rôle").selectOption({ label: role });
  if (extra.number) await d.getByLabel("Matricule").fill(extra.number);
  if (extra.cohort) await d.getByLabel("Promotion").selectOption({ label: extra.cohort });
  await d.getByRole("button", { name: "Inviter" }).click();
  const url = (await d.locator("code").textContent())!;
  await d.getByRole("button", { name: "Fermer" }).last().click();
  return url;
}

async function addRow(
  page: Page,
  section: string,
  button: string,
  fields: Record<string, string>,
  selects: Record<string, string> = {},
) {
  await page.getByRole("button", { name: button }).click();
  const d = dialog(page);
  // Optional fields are labelled "Niveau facultatif": match the start of the label.
  const field = (label: string) => d.getByLabel(new RegExp(`^${label}`));
  for (const [label, value] of Object.entries(fields)) await field(label).fill(value);
  for (const [label, value] of Object.entries(selects))
    await field(label).selectOption({ label: value });
  await d.getByRole("button", { name: "Enregistrer" }).click();
  await expect(d).toBeHidden();
  await expect(seen(page, section)).toBeVisible();
}

test("institution: super admin, admin, teacher and student work together", async ({
  page,
  browser,
}, info) => {
  test.skip(!OWNER || !OWNER_PASSWORD, "E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD not set");
  test.skip(info.project.name !== "desktop", "desktop scenario");
  test.setTimeout(180_000);
  const id = Date.now().toString(36);
  const now = new Date();
  const year = now.getUTCFullYear();

  // 1. Super admin creates the institution and gets the administrator's invitation link.
  await login(page, OWNER!, OWNER_PASSWORD);
  await expect(page).toHaveURL(/\/platform$/);
  await page.getByRole("button", { name: "Nouvel établissement" }).click();
  let d = dialog(page);
  await d.getByLabel("Nom", { exact: true }).fill(`Institut Supérieur ${id}`);
  await d.getByLabel("Identifiant").fill(`isup-${id}`);
  await d.getByLabel("E-mail de l'administrateur").fill(`dir-${id}@isup.sn`);
  await d.getByLabel("Formule").selectOption("premium"); // all modules, finance included
  await d.getByRole("button", { name: "Nouvel établissement" }).click();
  const adminUrl = (await d.locator("code").textContent())!;
  expect(adminUrl).toContain("/invite/");

  // 2. The administrator joins and builds the structure.
  const admin = await acceptInvitation(browser, adminUrl, "Aminata");
  await expect(admin).toHaveURL(/\/school$/);
  await expect(seen(admin, `Institut Supérieur ${id}`)).toBeVisible();

  await nav(admin, "Structure");
  await addRow(admin, `${year}-${year + 1}`, "Nouvelle année universitaire", {
    Nom: `${year}-${year + 1}`,
    Début: `${year}-01-01`,
    Fin: `${year}-12-31`,
  });
  await addRow(
    admin,
    "Semestre 1",
    "Nouvelle période",
    { Nom: "Semestre 1", Début: `${year}-01-01`, Fin: `${year}-12-30` },
    { "Année universitaire": `${year}-${year + 1}` },
  );
  await admin.getByRole("radio", { name: "Départements et formations" }).click();
  await addRow(admin, "Licence Informatique", "Nouvelle formation", {
    Nom: "Licence Informatique",
    Niveau: "Licence 1",
  });
  await admin.getByRole("radio", { name: "Promotions" }).click();
  await addRow(
    admin,
    "L1 Info",
    "Nouvelle promotion",
    { Nom: "L1 Info" },
    { Formation: "Licence Informatique", "Année universitaire": `${year}-${year + 1}` },
  );
  await admin.getByRole("radio", { name: "Salles" }).click();
  await addRow(admin, "Amphi A", "Nouvelle salle", { Nom: "Amphi A", Capacité: "200" });

  // People: a teacher and a student (enrolled in the cohort).
  await nav(admin, "Personnes");
  const teacherUrl = await invite(admin, `prof-${id}@isup.sn`, "Enseignant");
  const studentUrl = await invite(admin, `etu-${id}@isup.sn`, "Étudiant", {
    cohort: "L1 Info",
    number: `M-${id}`,
  });
  const teacher = await acceptInvitation(browser, teacherUrl, "Moussa");
  await expect(teacher).toHaveURL(/\/teaching$/);
  const student = await acceptInvitation(browser, studentUrl, "Fatou");
  await expect(student).toHaveURL(/\/dashboard$/);

  // Units and courses.
  await nav(admin, "UE et cours");
  await addRow(
    admin,
    "Programmation",
    "Nouvelle UE",
    { Nom: "Programmation", Crédits: "6" },
    { Période: "Semestre 1" },
  );
  await admin.getByRole("button", { name: "Ajouter un cours" }).click();
  d = dialog(admin);
  await d.getByLabel("Nom", { exact: true }).fill("Algorithmique");
  await d.getByLabel("Enseignant").selectOption({ label: `Moussa (prof-${id}@isup.sn)` });
  await d.getByRole("button", { name: "Enregistrer" }).click();
  await expect(seen(admin, "Algorithmique")).toBeVisible();

  // Timetable: a session today.
  await nav(admin, "Emploi du temps");
  await admin.getByRole("button", { name: "Ajouter une séance" }).click();
  d = dialog(admin);
  await d.getByLabel("Cours").selectOption({ label: "Algorithmique — L1 Info" });
  await d
    .getByLabel("Date")
    .fill(`${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`);
  await d.getByLabel("Salle").selectOption({ label: "Amphi A" });
  await d.getByRole("button", { name: "Ajouter une séance" }).click();
  await expect(seen(admin, "1 séance ajoutée")).toBeVisible();

  // Finance: bill the cohort, record a mobile money payment.
  await nav(admin, "Finances");
  await admin.getByRole("button", { name: "Nouvelle facture" }).click();
  d = dialog(admin);
  await d.getByLabel("Promotion").selectOption({ label: "L1 Info" });
  await d.getByLabel("Libellé").fill("Scolarité S1");
  await d.getByLabel("Montant").fill("450000");
  await d.getByRole("button", { name: "Nouvelle facture" }).click();
  await expect(seen(admin, "1 facture créée")).toBeVisible();
  await admin.getByRole("button", { name: "Encaisser" }).click();
  d = dialog(admin);
  await d.getByLabel("Montant").fill("150000");
  await d.getByLabel("Référence de transaction").fill("WAVE-123");
  await d.getByRole("button", { name: "Encaisser" }).click();
  await expect(seen(admin, "Paiement enregistré")).toBeVisible();

  // Announcement to everyone.
  await nav(admin, "Annonces");
  await admin.getByRole("button", { name: "Nouvelle annonce" }).click();
  d = dialog(admin);
  await d.getByLabel("Titre").fill("Rentrée solennelle");
  await d.getByLabel("Message").fill("Rendez-vous lundi à 9 h dans l'amphi A.");
  await d.getByRole("button", { name: "Nouvelle annonce" }).click();
  await expect(seen(admin, "Annonce publiée")).toBeVisible();

  // 3. The teacher grades and takes attendance.
  await teacher.reload();
  await teacher.getByRole("link", { name: /Algorithmique/ }).click();
  await teacher.getByRole("button", { name: "Nouvelle évaluation" }).first().click();
  d = dialog(teacher);
  await d.getByLabel("Titre").fill("Partiel");
  await d.getByRole("button", { name: "Nouvelle évaluation" }).click();
  await teacher.getByLabel("Fatou / 20").fill("14,5");
  await teacher.getByRole("button", { name: "Enregistrer les notes" }).click();
  await expect(seen(teacher, "Notes enregistrées")).toBeVisible();
  await teacher.getByRole("button", { name: "Publier" }).click();
  await expect(seen(teacher, /Évaluation publiée/)).toBeVisible();

  await nav(teacher, "Emploi du temps");
  await teacher.getByRole("button", { name: "Actions pour Algorithmique" }).click();
  await teacher.getByRole("menuitem", { name: "Faire l'appel" }).click();
  await dialog(teacher).getByRole("radio", { name: "Absent" }).click();
  await dialog(teacher).getByRole("button", { name: "Enregistrer" }).click();
  await expect(seen(teacher, "Appel enregistré")).toBeVisible();

  // 4. The student sees everything that concerns them.
  await nav(student, "Mes notes");
  await expect(seen(student, "Semestre 1")).toBeVisible();
  await expect(seen(student, "14.5")).toBeVisible();
  await nav(student, "Mes absences");
  await expect(seen(student, "Algorithmique")).toBeVisible();
  await nav(student, "Mes frais");
  await expect(seen(student, "Scolarité S1")).toBeVisible();
  await expect(seen(student, "WAVE-123").or(seen(student, "Partielle"))).toBeVisible();
  await nav(student, "Annonces");
  await expect(seen(student, "Rentrée solennelle")).toBeVisible();
  // A student cannot open the administration.
  await student.goto("/school/people");
  await expect(seen(student, "Accès réservé")).toBeVisible();

  // 5. Official transcript, verified publicly.
  await admin.goto("/school/results");
  await admin.getByLabel("Choisir un étudiant").selectOption({ label: `Fatou — M-${id}` });
  await expect(seen(admin, "14.5")).toBeVisible();
  await admin.getByRole("button", { name: "Émettre un relevé de notes" }).click();
  await expect(admin).toHaveURL(/\/documents\//);
  const code = (await admin.locator("strong.font-mono").textContent())!;
  const anonymous = await (await browser.newContext({ locale: "fr-FR" })).newPage();
  await anonymous.goto(`/verify/${code}`);
  await expect(seen(anonymous, "Document authentique")).toBeVisible();
  await expect(seen(anonymous, `Institut Supérieur ${id}`)).toBeVisible();
});
