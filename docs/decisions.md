# Décisions techniques

Format : contexte → décision → conséquences. À compléter à chaque choix structurant.

## D1. Frontend et backend séparés, même origine via le proxy Next.js

Le cahier des charges impose Next.js + FastAPI. Next.js relaie `/api/*` vers FastAPI (`rewrites` dans `next.config.ts`).

- Le cookie de session est first-party (même origine) : pas de cookie tiers, pas de `SameSite=None`, pas de requêtes CORS en préflight.
- FastAPI n'est pas exposé publiquement en production : seul Next.js l'est.
- L'URL du backend est **figée au build** de Next.js (les rewrites sont compilés) : l'image Docker du frontend reçoit `API_INTERNAL_URL` en argument de build.

## D2. Sessions côté serveur plutôt que JWT

Un token aléatoire de 256 bits est envoyé dans un cookie `HttpOnly` ; seul son SHA-256 est stocké en base (`user_sessions`).

- **Pourquoi pas un JWT ?** Un JWT ne peut pas être révoqué avant son expiration sans une liste noire, c'est-à-dire… une table de sessions. Pour une application à un seul backend, la session en base est plus simple et plus sûre : la déconnexion invalide réellement le cookie (testé : rejouer un ancien cookie donne 401).
- Le hachage du token protège les sessions en cas de fuite de la base. SHA-256 suffit ici (contrairement aux mots de passe) car le token a 256 bits d'entropie et ne peut pas être deviné.
- `HttpOnly` : le JavaScript, donc une éventuelle faille XSS, ne peut pas lire le token. Rien n'est stocké dans `localStorage`.
- Coût : une requête SQL par appel authentifié (lookup indexé sur `token_hash`, négligeable).

## D3. Protection CSRF : SameSite=Lax + vérification de l'en-tête Origin

Comme l'authentification passe par un cookie, un site tiers pourrait tenter de déclencher des requêtes avec ce cookie.

1. `SameSite=Lax` : le navigateur n'envoie pas le cookie sur un POST/PATCH/DELETE cross-site.
2. Le middleware `origin_check` rejette (403) toute requête modifiant des données dont l'en-tête `Origin` n'est pas dans `ALLOWED_ORIGINS`. Les navigateurs envoient toujours `Origin` sur ces requêtes.
3. L'API n'accepte que du JSON : un formulaire HTML cross-site ne peut pas produire un corps valide.

Pas de token CSRF à synchroniser : ces trois couches suffisent pour une API JSON de même origine (recommandation OWASP « defense in depth »).

## D4. Argon2id pour les mots de passe

`argon2-cffi` avec ses paramètres par défaut (RFC 9106). Les hachages sont recalculés à la connexion si les paramètres évoluent (`check_needs_rehash`). Lors d'une connexion avec un e-mail inconnu, un hash factice est quand même vérifié, pour que le temps de réponse ne révèle pas l'existence d'un compte.

Compromis assumé : l'inscription renvoie 409 si l'e-mail existe déjà, ce qui révèle qu'un compte existe. C'est le comportement attendu par le cahier des charges et usuel pour une V0.1 ; le corriger proprement nécessite un e-mail de confirmation (hors périmètre).

## D5. Limitation des tentatives de connexion par adresse e-mail

5 échecs par e-mail sur 15 minutes, puis 429 avec `Retry-After`. La limite est en mémoire (un seul processus backend en V0.1).

**Pas de limite par IP dans l'application** : derrière le proxy Next.js, toutes les requêtes arrivent de la même adresse, et `X-Forwarded-For` relayé par Next.js est falsifiable. Une limite par IP aurait bloqué *tous* les utilisateurs après 5 échecs de n'importe qui. Ce bug a été trouvé par le test de bout en bout puis corrigé, et un test de non-régression a été ajouté. La limitation par IP doit être faite par le reverse proxy public (nginx `limit_req`, Caddy, Cloudflare) au déploiement.

Limite connue : un attaquant peut bloquer temporairement le compte d'une victime en enchaînant les échecs sur son e-mail (15 min au maximum).

## D6. Isolation des données à deux niveaux

1. **Applicatif** : chaque service filtre par `user_id` de l'utilisateur authentifié, jamais par un identifiant venant du client (`extra="forbid"` refuse d'ailleurs un `user_id` dans le corps). Un élément d'un autre utilisateur renvoie 404, comme un identifiant inexistant : impossible de sonder les identifiants des autres.
2. **Base de données** : clé étrangère composite `(subject_id, user_id) → subjects(id, user_id)`. Voir `docs/database.md`.

Les tests `tests/test_isolation.py` vérifient lecture, modification, suppression, filtrage, liaison à la matière d'un autre et tableau de bord. Ils ont été validés en introduisant volontairement la faille : ils échouent bien.

## D7. SQLAlchemy synchrone

FastAPI exécute les routes `def` dans un pool de threads : le mode synchrone est plus simple à lire, à tester et à déboguer, sans perte réelle à cette échelle. Passer en asynchrone (`asyncpg`) ne se justifiera qu'avec une forte concurrence.

## D8. Énumérations en VARCHAR + CHECK

Plutôt qu'un type `ENUM` PostgreSQL : ajouter une valeur se fait par une migration triviale (modifier le `CHECK`), alors qu'un `ENUM` impose `ALTER TYPE` avec ses restrictions transactionnelles.

## D9. Tests sur un vrai PostgreSQL, schéma créé par les migrations

Les tests tournent sur `campushub_test` (et refusent toute base dont le nom ne finit pas par `_test`). Le schéma est créé par `alembic upgrade head` : les migrations sont testées à chaque exécution. SQLite aurait masqué les contraintes spécifiques (index sur expression, `SET NULL (colonne)`, `timestamptz`). La CI vérifie aussi `alembic check` (modèles et migrations concordent).

Leçon retenue : l'autogénération d'Alembic avait d'abord produit un index unique sur `lower('name')` (une **chaîne constante**) au lieu de `lower(name)`, à cause de `func.lower("name")`. Cela aurait limité chaque utilisateur à une seule matière. Corrigé avec `text("lower(name)")`. **Toujours relire une migration générée.**

## D10. Composants « à la shadcn/ui » écrits dans le dépôt

shadcn/ui n'est pas une dépendance : c'est du code copié dans le projet, construit sur Radix et `class-variance-authority`. Le CLI `shadcn` n'a pas pu télécharger son registre dans l'environnement où le projet a été initialisé ; les composants nécessaires (bouton, champs, dialogue, confirmation, menu, badge, carte) ont donc été écrits à la main selon les mêmes conventions. `components.json` est présent : `pnpm dlx shadcn@latest add <composant>` fonctionne sur une machine normale.

Les listes déroulantes sont des `<select>` natifs stylés : meilleure ergonomie sur mobile et intégration triviale avec React Hook Form.

## D11. Données côté client avec TanStack Query

Les pages Next.js sont pré-rendues (shell statique) puis chargent les données de l'utilisateur dans le navigateur. TanStack Query fournit les états chargement/erreur/succès, le cache, l'invalidation ciblée après chaque modification et le rafraîchissement du tableau de bord toutes les minutes (les retards dépendent de l'heure). Un 401 sur n'importe quelle requête renvoie vers `/login?expired=1`. La déconnexion recharge complètement la page pour ne rien laisser en mémoire du compte précédent.

Alternative écartée : Server Components qui appellent FastAPI côté serveur en relayant le cookie. Plus de complexité (relais du cookie, Suspense partout avec Cache Components) pour un gain faible sur une application entièrement privée.

## D12. Dates : UTC en base, Europe/Paris à l'écran

L'API exige des dates avec fuseau (`AwareDatetime`) et les convertit en UTC. Le frontend convertit la saisie `datetime-local`, lue comme heure de Paris, en instant UTC, et inversement, sans bibliothèque (`Intl` uniquement). Tests unitaires, y compris aux changements d'heure.

## D13. Direction visuelle « app mobile »

Inspirée des applications de suivi d'habitudes : fond gris doux, cartes blanches très arrondies sans bordure (ombre légère), noir « encre » pour les états sélectionnés (jour, filtre, menu actif), un seul accent bleu pour les actions principales, vert pour la progression. Police Plus Jakarta Sans, embarquée via `@fontsource-variable` : aucun appel à Google Fonts au build ni à l'exécution.

Le tableau de bord est pensé pour le pouce : bande des jours de la semaine (les jours chargés portent un point), jauge de la semaine calendaire, carte « Prochaine échéance » avec une action directe, liste filtrable par pastilles. Sur mobile, une barre de navigation inférieure avec un bouton « + » central donne accès à l'ajout rapide depuis toutes les pages ; les formulaires s'ouvrent en bottom sheet.

Pour alimenter la bande des jours, l'API a gagné des filtres de période (`due_after`/`due_before`, `after`/`before`) et le résumé du tableau de bord un bloc `week` calculé sur la semaine calendaire de Paris.

## Limites connues de la V0.1

- Limitation de connexion en mémoire : à déplacer en base ou dans Redis avec plusieurs workers.
- Pas de suppression de compte, de changement d'e-mail ou de mot de passe, ni de réinitialisation par e-mail.
- Pas de nettoyage planifié des sessions expirées (elles sont purgées à la connexion suivante de l'utilisateur).
- Pas de pipeline de déploiement (volontaire tant que le processus n'est pas fiabilisé) ; en production, prévoir HTTPS (cookies `Secure`), `ENVIRONMENT=production` et une limitation par IP au reverse proxy.
