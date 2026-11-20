# Base de données

PostgreSQL 16. Le schéma est défini par les modèles SQLAlchemy (`backend/app/models`) et créé **uniquement** par les migrations Alembic (`backend/alembic/versions`).

Conventions :

- identifiants : UUID v4 générés par l'application ;
- dates : `timestamptz`, stockées et relues en UTC ;
- `created_at` / `updated_at` remplis par PostgreSQL (`now()`) ;
- énumérations stockées en `VARCHAR` avec une contrainte `CHECK` (plus simples à faire évoluer qu'un type `ENUM` PostgreSQL) ;
- noms de contraintes déterministes (`pk_`, `fk_`, `uq_`, `ck_`, `ix_`), donc des migrations lisibles.

## Diagramme

```text
users 1───1 profiles
  │ 1
  ├───* user_sessions
  ├───* subjects 1───────┐
  ├───* assignments *────┤ (subject_id, user_id) → subjects(id, user_id)
  └───* exams       *────┘   ON DELETE SET NULL (subject_id)
```

## Tables

### `users`

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | uuid | PK |
| `email` | varchar(320) | unique, `CHECK (email = lower(email))` |
| `password_hash` | varchar(255) | hash Argon2id |
| `is_active` | boolean | défaut `true` |
| `created_at`, `updated_at` | timestamptz | |

### `profiles`

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `user_id` | uuid | PK, FK → `users.id` **ON DELETE CASCADE** |
| `first_name` | varchar(100) | obligatoire |
| `promotion` | varchar(50) | facultatif |
| `academic_year` | smallint | facultatif, `CHECK BETWEEN 1 AND 8` |
| `speciality` | varchar(100) | facultatif |
| `td_group`, `tp_group` | varchar(50) | facultatifs |
| `created_at`, `updated_at` | timestamptz | |

Relation 1-1 : la clé primaire est l'identifiant de l'utilisateur, ce qui interdit d'avoir deux profils pour un compte.

### `user_sessions`

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE, indexé |
| `token_hash` | varchar(64) | unique, SHA-256 hexadécimal du token du cookie |
| `created_at`, `expires_at` | timestamptz | |

### `subjects`

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `name` | varchar(100) | obligatoire |
| `description` | text | facultatif (2000 caractères max., validé par l'API) |
| `color` | varchar(7) | facultatif, `CHECK (color ~ '^#[0-9a-f]{6}$')` |
| `created_at`, `updated_at` | timestamptz | |

- Index unique `uq_subjects_user_id_lower_name` sur `(user_id, lower(name))` : un utilisateur ne peut pas avoir deux matières de même nom, casse ignorée (« Maths » et « MATHS »). Deux utilisateurs différents le peuvent.
- Contrainte unique `(id, user_id)` : cible des clés étrangères composites ci-dessous.

### `assignments`

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `subject_id` | uuid | facultatif |
| `title` | varchar(200) | obligatoire |
| `description` | text | facultatif |
| `due_at` | timestamptz | obligatoire |
| `priority` | varchar(16) | `CHECK IN ('low','normal','high')`, défaut `normal` |
| `status` | varchar(16) | `CHECK IN ('todo','in_progress','done')`, défaut `todo` |
| `created_at`, `updated_at` | timestamptz | |

Index : `(user_id, due_at)` (listes triées par échéance et tableau de bord), `(subject_id)` (suppression d'une matière, filtre par matière).

### `exams`

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` ON DELETE CASCADE |
| `subject_id` | uuid | facultatif |
| `title` | varchar(200) | obligatoire |
| `exam_at` | timestamptz | obligatoire |
| `room` | varchar(100) | facultatif |
| `description` | text | facultatif |
| `created_at`, `updated_at` | timestamptz | |

Index : `(user_id, exam_at)`, `(subject_id)`.

## Clé étrangère composite vers `subjects`

```sql
FOREIGN KEY (subject_id, user_id) REFERENCES subjects (id, user_id)
    ON DELETE SET NULL (subject_id)
```

- **Isolation garantie par la base** : un devoir de Bob ne peut référencer qu'une matière dont `user_id` est celui de Bob. Le service le vérifie déjà (réponse 422), la base est une seconde barrière.
- **Suppression sûre** : supprimer une matière met `subject_id` à `NULL` dans les devoirs et examens liés, qui sont conservés. La liste de colonnes `SET NULL (subject_id)` (PostgreSQL ≥ 15) ne vide que `subject_id` ; un simple `SET NULL` viderait aussi `user_id`, ce qui est interdit.
- Quand `subject_id` est `NULL`, la contrainte n'est pas vérifiée (comportement `MATCH SIMPLE`) : un élément sans matière est valide.

## Suppressions

| Suppression de… | Effet |
| --- | --- |
| un utilisateur | supprime en cascade profil, sessions, matières, devoirs et examens (testé) |
| une matière | devoirs et examens conservés, `subject_id` mis à `NULL` (testé) |
| un devoir ou un examen | aucun effet de bord |

La V0.1 n'expose pas encore d'endpoint de suppression de compte, mais le schéma la rend cohérente.
