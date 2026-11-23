# CampusHub

Plateforme universitaire SaaS : scolarité, notes et crédits, emploi du temps, absences, frais de scolarité, documents officiels vérifiables et communication, pour plusieurs établissements indépendants. Pensée pour le supérieur (système LMD, crédits, compensation) et pour le marché africain (barèmes, devises, fuseaux et langues configurables, paiement mobile money enregistré).

## Rôles

| Rôle | Espace |
| --- | --- |
| **Super administrateur** (propriétaire de CampusHub) | Console plateforme : établissements (création, formule, modules, suspension), utilisateurs, statistiques, journal d'activité global |
| **Administrateur d'établissement** | Son établissement uniquement : paramètres et identité, structure académique, personnes, UE et cours, emploi du temps, résultats, absences, finances, documents, annonces, journal |
| **Enseignant** | Ses cours : évaluations, saisie des notes, appel ; emploi du temps ; annonces à ses promotions |
| **Étudiant** | Emploi du temps, notes et crédits, absences, frais, documents officiels, annonces, et son organisation personnelle (devoirs, examens, matières) |

Les permissions sont vérifiées **par le serveur** à chaque requête, et les données sont isolées par établissement jusque dans la base (clés étrangères composites). De nouveaux rôles (responsable pédagogique, secrétariat, parent…) s'ajoutent dans `backend/app/core/permissions.py`.

## Fonctionnalités

**Plateforme et établissements**
- Établissements indépendants, chacun avec sa formule (Essentiel, Standard, Premium) et ses modules activables : notes, emploi du temps, absences, finances, annonces, documents.
- Paramètres par établissement : nom, logo, couleur principale (appliquée à l'interface), langue, fuseau horaire, devise, barème (note maximale, seuil de validation), compensation entre UE.
- Comptes créés par invitation (lien à transmettre par e-mail ou WhatsApp) ou import CSV ; mot de passe oublié ; un compte peut appartenir à plusieurs établissements.
- Journal d'activité de toutes les actions sensibles.

**Scolarité**
- Structure : années universitaires, périodes (semestres, trimestres…), départements, formations, promotions, salles.
- UE avec crédits, cours avec coefficient et enseignant, inscriptions des étudiants dans les promotions.
- Notes : évaluations pondérées sur n'importe quel barème, saisie en grille, publication contrôlée par l'enseignant.
- Résultats : moyennes de cours, d'UE et de période, crédits obtenus, compensation optionnelle.
- Documents officiels : relevés de notes et attestations de scolarité figés à l'émission, imprimables, avec **QR code** et page publique de vérification (anti-fraude), révocables.

**Vie de l'établissement**
- Emploi du temps hebdomadaire, détection des conflits (salle, enseignant, promotion), séances répétées chaque semaine.
- Appel par séance (présent, absent, retard, excusé), justification des absences, taux de présence.
- Frais de scolarité : factures individuelles ou pour toute une promotion, paiements (espèces, virement, **mobile money** avec référence de transaction, carte), soldes, retards, taux de recouvrement.
- Annonces ciblées (tout l'établissement, étudiants, enseignants, une promotion).

**Espace personnel de l'étudiant** (version initiale, conservée) : devoirs, examens et matières personnels, tableau de bord de la semaine, ajout rapide.

**Interface** : design system « Campus » (verre pour les couches flottantes, Soft UI, tableaux denses), thèmes clair et sombre, français et anglais, responsive, fuseau horaire de chaque utilisateur. Voir [docs/design-system.md](docs/design-system.md).

**Pas encore disponible** : paiement en ligne automatique (les encaissements sont enregistrés par l'établissement), notifications par e-mail ou SMS (hors invitations et mot de passe), messagerie, admissions en ligne, portail parents, vacataires, mode hors ligne. Voir la [roadmap](#roadmap).

## Stack

| Couche | Technologies |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, composants façon shadcn/ui (Radix), polices Fraunces et Inter (embarquées), Lucide, traduction sans dépendance (FR/EN), TanStack Query, React Hook Form + Zod |
| Backend | Python 3.13, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic, Argon2id, envoi d'e-mails SMTP interchangeable |
| Base de données | PostgreSQL 16 |
| Qualité | Pytest, Ruff, mypy (strict), ESLint, Prettier, Vitest, Playwright |
| Infra | Docker, Docker Compose, GitHub Actions |

## Architecture

```text
Navigateur ──► Next.js (:3000) ──/api/*──► FastAPI (:8000) ──► PostgreSQL
               pages + UI          rewrite    routes → services → SQLAlchemy
```

Le navigateur ne parle qu'à Next.js, qui relaie `/api/*` vers FastAPI : le cookie de session reste sur la même origine. Détails dans [docs/architecture.md](docs/architecture.md), schéma de la base dans [docs/database.md](docs/database.md), choix techniques dans [docs/decisions.md](docs/decisions.md).

```text
backend/
  app/api/        routes HTTP (FastAPI) et dépendances (utilisateur courant)
  app/core/       configuration, sécurité, middleware CSRF, limitation de connexion
  app/db/         base SQLAlchemy, session
  app/models/     tables
  app/schemas/    validation entrées/sorties (Pydantic)
  app/services/   règles métier (toujours filtrées par utilisateur)
  alembic/        migrations
  tests/          tests Pytest (base PostgreSQL dédiée)
frontend/
  app/            routes Next.js : (auth)/login, (auth)/register, (app)/dashboard…
  features/       une fonctionnalité = ses hooks API, schémas Zod et composants
  components/     UI générique (components/ui) et mise en page
  lib/            client API, traductions (i18n/), dates et fuseaux, thème, cache de requêtes
  types/          types des réponses de l'API
  e2e/            parcours critique Playwright
```

## Démarrage rapide avec Docker

Prérequis : Docker et Docker Compose.

```bash
cp .env.example .env    # facultatif : des valeurs de développement existent par défaut
```

```bash
docker compose up --build -d
```

- Application : http://localhost:3000
- Documentation de l'API (Swagger) : http://localhost:8000/api/docs

Les migrations sont appliquées automatiquement par le service `migrate` avant le démarrage du backend.

```bash
docker compose logs -f backend    # suivre les logs
```

```bash
docker compose down               # arrêter (les données sont conservées)
```

> ⚠️ `docker compose down -v` **supprime le volume PostgreSQL**, donc toutes les données.

### Créer le super administrateur (propriétaire de la plateforme)

Il n'existe aucune inscription publique vers la console : le compte se crée en ligne de commande.

```bash
docker compose exec backend python -m app.cli create-superadmin --email vous@exemple.com --first-name Prénom
```

(En local sans Docker : `cd backend && uv run python -m app.cli create-superadmin …`.) Connecte-toi ensuite : la console `/platform` permet de créer un établissement et fournit le lien d'invitation de son administrateur.

## Développement local (sans Docker pour le code)

Prérequis : Python 3.13 + [uv](https://docs.astral.sh/uv/), Node.js 22 + pnpm (`corepack enable`), PostgreSQL 16 (local ou `docker compose up -d db`).

### Base de données

Avec Docker, il suffit de lancer uniquement PostgreSQL :

```bash
docker compose up -d db
```

Les tests utilisent une base séparée, à créer une fois :

```bash
docker compose exec db psql -U campushub -c "CREATE DATABASE campushub_test"
```

### Backend

```bash
cd backend
uv sync                                   # installe les dépendances (lockfile uv.lock)
uv run alembic upgrade head               # applique les migrations
uv run uvicorn app.main:app --reload      # http://localhost:8000/api/docs
```

La configuration est lue dans les variables d'environnement ou dans `backend/.env` (le `.env` racine n'est lu que par Docker Compose), voir [`.env.example`](.env.example). Par défaut : `postgresql+psycopg://campushub:campushub@localhost:5432/campushub`. Si tu as changé `POSTGRES_PASSWORD`, reporte-le dans `DATABASE_URL` (dans `backend/.env`).

### Frontend

```bash
cd frontend
pnpm install
pnpm dev                                  # http://localhost:3000
```

Next.js relaie `/api/*` vers `API_INTERNAL_URL` (par défaut `http://localhost:8000`).

## Variables d'environnement

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL du backend | `postgresql+psycopg://campushub:campushub@localhost:5432/campushub` |
| `ENVIRONMENT` | `development`, `test` ou `production` (cookies `Secure`, Swagger masqué) | `development` |
| `ALLOWED_ORIGINS` | Origines autorisées (CORS + vérification CSRF), séparées par des virgules | `http://localhost:3000` |
| `SESSION_TTL_DAYS` | Durée de vie d'une session | `14` |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_SECONDS` | Échecs de connexion tolérés par e-mail et par fenêtre | `5` / `900` |
| `COOKIE_SECURE` | Force l'attribut `Secure` du cookie (sinon : vrai en production) | — |
| `FRONTEND_URL` | Adresse publique du site, utilisée dans les liens d'invitation et de réinitialisation | `http://localhost:3000` |
| `EMAIL_BACKEND` | `console` (e-mails affichés dans les logs), `smtp` (production) ou `memory` (tests) | `console` |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS` | Fournisseur d'e-mails (tout service SMTP : Brevo, Mailgun, SES…) | — |
| `API_INTERNAL_URL` | URL de FastAPI vue par Next.js (**figée au build** en production) | `http://localhost:8000` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Conteneur PostgreSQL | `campushub` / `campushub` / `campushub` / `5432` |

Ne committe jamais de fichier `.env` : il est ignoré par Git.

## Migrations

```bash
cd backend
uv run alembic upgrade head                              # appliquer
uv run alembic revision --autogenerate -m "description"  # créer après une modification des modèles
uv run alembic check                                     # vérifier que modèles et migrations concordent
```

Relis toujours une migration générée avant de l'appliquer (l'autogénération peut se tromper, voir `docs/decisions.md`).

## Tests et vérifications

```bash
cd backend
uv run pytest                     # tests (base campushub_test, recréée à chaque lancement)
uv run ruff format --check . && uv run ruff check . && uv run mypy app tests
```

Les tests refusent de tourner sur une base dont le nom ne se termine pas par `_test`. Une autre base peut être indiquée avec `TEST_DATABASE_URL`.

```bash
cd frontend
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

Parcours de bout en bout (inscription → profil → matière → devoir → examen → tableau de bord → déconnexion → isolation entre deux comptes), sur desktop et mobile, avec la pile démarrée :

```bash
cd frontend
pnpm exec playwright install chromium   # une seule fois
pnpm test:e2e
```

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute tout cela à chaque push et pull request.

## Captures d'écran

_À ajouter : tableau de bord (desktop et mobile), devoirs, examens._

## Roadmap

Fait : multi-établissement et rôles, structure LMD, notes et crédits, documents vérifiables, emploi du temps, absences, frais, annonces, console plateforme.

Prochaines étapes, par priorité :

1. **Paiement en ligne** via un agrégateur (CinetPay, PayDunya, Flutterwave, Paystack…) une fois le fournisseur choisi ; reçus PDF.
2. **Notifications** : e-mail puis SMS / WhatsApp (nouvelle note publiée, absence, facture en retard, annonce).
3. **Admissions en ligne** (candidature, pièces, frais de dossier) et **portail parents**.
4. **Examens de bout en bout** (planning, convocations, surveillance, anonymat des copies), **rattrapages**, délibérations de jury.
5. **Vacataires** (services, heures, états de paiement), statistiques académiques avancées, exports pour les tutelles.
6. Mode faible connexion (application installable, consultation hors ligne), arabe et portugais, sous-domaine par établissement, isolation complémentaire par Row Level Security.

Limites connues : voir la fin de [docs/decisions.md](docs/decisions.md).
