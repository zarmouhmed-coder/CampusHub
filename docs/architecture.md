# Architecture

## Vue d'ensemble

```text
                 Navigateur
                     │  HTTPS, cookie de session HttpOnly
                     ▼
     ┌──────────────────────────────────┐
     │ Next.js (frontend, port 3000)    │
     │  • pages pré-rendues (shell)     │
     │  • proxy.ts : redirection        │
     │    optimiste vers /login         │
     │  • rewrite /api/* → FastAPI      │
     └──────────────────────────────────┘
                     │  HTTP/JSON (réseau interne)
                     ▼
     ┌──────────────────────────────────┐
     │ FastAPI (backend, port 8000)     │
     │  middleware : vérif. Origin,CORS │
     │  routes (app/api)                │
     │   └ Depends(get_current_user)    │
     │  schémas Pydantic (app/schemas)  │
     │  services (app/services)         │
     │  SQLAlchemy (app/models)         │
     └──────────────────────────────────┘
                     │  psycopg 3
                     ▼
               PostgreSQL 16
```

## Rôle de chaque composant

**Next.js** sert l'interface. Les pages sont des Server Components minces qui affichent un composant client par fonctionnalité (`features/*/…-view.tsx`). Les données sont chargées côté navigateur avec TanStack Query, qui gère le cache, les états de chargement et d'erreur, et le rafraîchissement après une modification.

- `proxy.ts` (le « middleware » de Next 16) redirige vers `/login` quand il n'y a **pas** de cookie de session. C'est une optimisation d'UX, pas une sécurité : il ne vérifie pas la validité du cookie.
- `next.config.ts` relaie `/api/*` vers FastAPI. Le navigateur ne voit qu'une seule origine.

**FastAPI** porte toutes les règles métier et tous les contrôles d'accès :

1. Le middleware `origin_check` rejette (403) toute requête qui modifie des données et provient d'une origine non autorisée.
2. La dépendance `get_current_user` lit le cookie, hache le token et charge la session en base. Absent, expiré ou révoqué : 401.
3. Pydantic valide le corps de la requête (types, longueurs, dates avec fuseau, champs inconnus refusés) : 422 sinon.
4. Le service exécute la règle métier. **Chaque requête SQL est filtrée par `user_id = utilisateur courant`.** Un élément d'un autre utilisateur est traité comme inexistant (404).
5. La route valide la transaction (`db.commit()`) et renvoie le schéma de sortie.

**PostgreSQL** stocke les données et applique les contraintes (unicité, `CHECK`, clés étrangères), dont la clé étrangère composite qui empêche, même en cas de bug applicatif, de lier un devoir à la matière d'un autre utilisateur.

## Exemple : changer le statut d'un devoir

```text
Clic sur la case ─► PATCH /api/v1/assignments/{id}  {"status": "done"}
  Next.js relaie ─► FastAPI
    origin_check : Origin = http://localhost:3000 ✓
    get_current_user : cookie → sha256 → user_sessions → User ✓
    AssignmentUpdate : status ∈ {todo, in_progress, done} ✓
    service : SELECT … WHERE id = :id AND user_id = :user  (404 si absent)
              UPDATE assignments SET status = 'done', updated_at = now()
    commit ─► 200 + devoir mis à jour
  TanStack Query invalide ["assignments"] et ["dashboard"] ─► les listes se rafraîchissent
```

## Authentification

Voir `docs/decisions.md` (D2). En résumé : inscription ou connexion → l'API crée une ligne `user_sessions` avec le SHA-256 d'un token aléatoire de 256 bits et renvoie le token dans un cookie `HttpOnly; SameSite=Lax` (et `Secure` en production). La déconnexion supprime la ligne : le cookie devient inutilisable immédiatement.

## Dates

L'API reçoit et renvoie des instants ISO 8601 avec fuseau, stockés en `timestamptz` et toujours relus en UTC (`timezone=UTC` à la connexion). L'interface affiche et saisit les dates dans le fuseau du profil de l'utilisateur (`profiles.timezone`), quel que soit celui du navigateur (`frontend/lib/dates.ts`, testé aux changements d'heure et pour plusieurs fuseaux africains).

## API

Toutes les routes sont préfixées par `/api/v1`. La documentation OpenAPI interactive est disponible sur `/api/docs` hors production.

| Ressource | Routes |
| --- | --- |
| Santé | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Profil | `GET /profile/me`, `PATCH /profile/me` |
| Matières | `GET/POST /subjects`, `GET/PATCH/DELETE /subjects/{id}` |
| Devoirs | `GET/POST /assignments`, `GET/PATCH/DELETE /assignments/{id}` ; filtres `status`, `priority`, `subject_id`, `due_after` (inclus), `due_before` (exclu), `order=asc\|desc`, `limit` (1-100), `offset` |
| Examens | `GET/POST /exams`, `GET/PATCH/DELETE /exams/{id}` ; filtres `when=all\|upcoming\|past`, `subject_id`, `after` (inclus), `before` (exclu), `limit`, `offset` |
| Tableau de bord | `GET /dashboard/summary` : prochains devoirs, retards, prochains examens, compteurs et progression de la semaine calendaire (lundi-dimanche, fuseau de l'utilisateur) |

Les listes paginées renvoient `{items, total, limit, offset}`. Les erreurs ont toujours la forme `{"code": …, "detail": …}`. `code` est stable et traduit par l'interface (`auth_required`, `invalid_credentials`, `too_many_attempts`, `email_taken`, `subject_name_taken`, `subject_not_found`, `not_found`, `origin_forbidden`, `validation_error`, `internal_error`) ; `detail` est un message anglais destiné aux développeurs, ou la liste des champs invalides pour `validation_error` (422).

Codes utilisés : 200, 201 (création), 204 (suppression, déconnexion), 401, 403 (origine refusée), 404, 409 (e-mail ou nom de matière déjà pris), 422, 429 (trop de tentatives de connexion), 500 (message générique, détails uniquement dans les logs).

## Multi-établissement (depuis la version « plateforme »)

```text
Requête ──► cookie de session ──► user_sessions (utilisateur + établissement actif)
                                       │
                         get_ctx() ────┴──► Membership (rôle) + Institution (statut, modules)
                                       │
                 require("grades.enter", "grades") ──► 403 forbidden / module_disabled
                                       │
                 service : toutes les requêtes filtrées par institution_id
```

- **Établissement actif** : stocké dans la session côté serveur (`user_sessions.institution_id`), jamais fourni par le navigateur. `POST /auth/institution` permet de changer d'établissement pour les comptes rattachés à plusieurs.
- **Rôles → permissions** : `backend/app/core/permissions.py`. Chaque route déclare la permission (et le module) qu'elle exige via `require(...)`. Les enseignants sont en plus restreints à **leurs** cours (`owned_course`).
- **Modules** : `institutions.modules` (fixé par la formule, ajustable par le super administrateur). Un module désactivé renvoie `403 module_disabled` et disparaît de la navigation.
- **Suspension** : un établissement suspendu renvoie `403 institution_suspended` à tous ses membres.
- **Isolation** : filtrage systématique par `institution_id` dans les services **et** clés étrangères composites `(x_id, institution_id)` : la base refuse qu'une note, une séance ou une facture pointe vers une ligne d'un autre établissement.
- **CRUD générique** : `backend/app/api/crud.py` génère les routes de la structure académique (filtrage, vérification des références, codes `in_use` / `duplicate`, journal).
- **Journal d'activité** : `audit_logs`, alimenté par chaque action d'administration, de notation, de finance et de document.

### Routes ajoutées

| Domaine | Routes (préfixe `/api/v1`) |
| --- | --- |
| Session | `POST /auth/institution`, `POST /auth/password-reset`, `POST /auth/password-reset/confirm` |
| Invitations (public) | `GET /invitations/{token}`, `POST /invitations/{token}/accept` |
| Plateforme (super admin) | `GET/POST /platform/institutions`, `GET/PATCH /platform/institutions/{id}`, `GET /platform/users`, `GET /platform/stats`, `GET /platform/audit` |
| Établissement (admin) | `GET/PATCH /school/settings`, `GET /school/overview`, `GET /school/audit`, CRUD `/school/{departments,programs,academic-years,periods,cohorts,rooms,units,courses}`, `GET /school/members`, `PATCH /school/members/{id}`, `POST/DELETE /school/members/{id}/enrollments[/{cohort}]`, `GET/POST/DELETE /school/invitations`, `POST /school/invitations/import` |
| Enseignement | `GET /teaching/courses[/{id}]`, `GET/POST /teaching/courses/{id}/assessments`, `PATCH/DELETE /teaching/assessments/{id}`, `GET/PUT /teaching/assessments/{id}/grades`, `GET/PUT /teaching/sessions/{id}/attendance` |
| Emploi du temps | `GET /timetable?start&end`, `POST /school/sessions`, `PATCH/DELETE /school/sessions/{id}` |
| Résultats et documents | `GET /me/results`, `GET /school/students/{id}/results`, `POST/GET /school/documents`, `POST /school/documents/{id}/revoke`, `GET /documents/{id}`, `GET /me/documents`, `GET /verify/{code}` (public) |
| Absences | `GET /me/attendance`, `GET /school/attendance`, `PATCH /school/attendance/{id}` |
| Finances | `POST /school/invoices`, `POST /school/invoices/bulk`, `GET /school/invoices`, `PATCH/DELETE /school/invoices/{id}`, `POST /school/invoices/{id}/payments`, `DELETE /school/payments/{id}`, `GET /school/finance/summary`, `GET /me/invoices` |
| Annonces | `GET/POST /announcements`, `DELETE /announcements/{id}` |
