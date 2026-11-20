# CampusHub

Tableau de bord web pour les étudiants : devoirs, TP, projets, examens et matières réunis au même endroit, avec les prochaines échéances en un coup d'œil.

V0.1, pensée d'abord pour les étudiants de Télécom Nancy.

## Fonctionnalités (V0.1)

- **Comptes** : inscription, connexion, déconnexion, session par cookie `HttpOnly`, pages privées protégées.
- **Profil** : prénom, promotion, année, spécialité, groupes de TD et de TP (seul le prénom est obligatoire).
- **Matières** : création, modification, suppression, couleur. Supprimer une matière **conserve** ses devoirs et examens (ils passent « sans matière »).
- **Devoirs** (devoirs, TP, projets) : échéance, priorité, statut (à faire, en cours, terminé), matière ; tri par échéance, filtres par statut, priorité et matière, pagination ; changement de statut en un clic.
- **Examens** : date et heure, salle, matière, description ; vues « À venir » et « Passés ».
- **Tableau de bord** : message d'accueil, bande des jours de la semaine, jauge de progression de la semaine, prochaine échéance avec action directe, listes « Aujourd'hui / À venir / En retard / Examens », états vides utiles.
- **Ajout rapide** : bouton « + » accessible depuis toutes les pages (barre inférieure sur mobile).
- **Isolation stricte** : un étudiant ne peut ni lire, ni modifier, ni supprimer les données d'un autre, y compris en modifiant un identifiant dans l'URL (vérifié par des tests).
- Interface responsive : barre latérale sur ordinateur, navigation inférieure sur mobile.

Hors périmètre de la V0.1 : notes, emploi du temps, notifications, IA, connexion Google/Microsoft… (voir [Roadmap](#roadmap)).

## Stack

| Couche | Technologies |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, composants façon shadcn/ui (Radix), police Plus Jakarta Sans, Lucide, TanStack Query, React Hook Form + Zod |
| Backend | Python 3.13, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic, Argon2id |
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
  lib/            client API, dates (Europe/Paris), cache de requêtes
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

- **V0.2, organisation** : emploi du temps, cours récurrents, événements, filtres avancés, meilleure expérience mobile.
- **V0.3, notes** : notes, coefficients, moyennes, graphiques.
- **V0.4, communauté** : événements étudiants, annonces, objets perdus, groupes de travail, modération.
- **V1** : déploiement public, sauvegardes, monitoring, retours utilisateurs, assistant étudiant.

Limites connues de la V0.1 : voir la fin de [docs/decisions.md](docs/decisions.md).
