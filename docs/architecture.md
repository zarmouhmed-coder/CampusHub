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

L'API reçoit et renvoie des instants ISO 8601 avec fuseau, stockés en `timestamptz` et toujours relus en UTC (`timezone=UTC` à la connexion). L'interface affiche et saisit les dates en heure de Paris, quel que soit le fuseau du navigateur (`frontend/lib/dates.ts`, testé y compris aux changements d'heure).

## API

Toutes les routes sont préfixées par `/api/v1`. La documentation OpenAPI interactive est disponible sur `/api/docs` hors production.

| Ressource | Routes |
| --- | --- |
| Santé | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Profil | `GET /profile/me`, `PATCH /profile/me` |
| Matières | `GET/POST /subjects`, `GET/PATCH/DELETE /subjects/{id}` |
| Devoirs | `GET/POST /assignments`, `GET/PATCH/DELETE /assignments/{id}` ; filtres `status`, `priority`, `subject_id`, `order=asc\|desc`, `limit` (1-100), `offset` |
| Examens | `GET/POST /exams`, `GET/PATCH/DELETE /exams/{id}` ; filtres `when=all\|upcoming\|past`, `subject_id`, `limit`, `offset` |
| Tableau de bord | `GET /dashboard/summary` |

Les listes paginées renvoient `{items, total, limit, offset}`. Les erreurs ont toujours la forme `{"detail": …}` : un message (401, 403, 404, 409, 429, 500) ou la liste des erreurs de validation (422).

Codes utilisés : 200, 201 (création), 204 (suppression, déconnexion), 401, 403 (origine refusée), 404, 409 (e-mail ou nom de matière déjà pris), 422, 429 (trop de tentatives de connexion), 500 (message générique, détails uniquement dans les logs).
