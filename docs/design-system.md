# Design system « Campus »

Référence visuelle de CampusHub. Objectif : une **université numérique** sérieuse et moderne, agréable plusieurs heures par jour, dense en informations sans être encombrée.

Le code source fait foi : jetons dans `frontend/app/globals.css`, composants dans `frontend/components/ui/`.

## 1. Principes

1. **Chaque espace a une utilité.** Pas de grandes cartes pour trois chiffres : les indicateurs tiennent dans un bandeau compact, les listes longues passent en tableau sur ordinateur.
2. **Trois familles de surfaces, chacune à sa place** (voir §4). Le verre n'est jamais utilisé pour du contenu à lire longuement.
3. **Une couleur d'action, une couleur de distinction.** Le bleu institutionnel sert aux actions, l'or patiné aux repères (jour chargé, élément actif, en-têtes de section). Le reste est neutre.
4. **Identité universitaire** : titres en serif, écusson, motif d'arches, vocabulaire académique.
5. **Accessibilité d'abord** : contrastes AA, focus visible, transparence et animations désactivables par le système.

## 2. Couleurs

| Jeton | Clair | Sombre (« Amphithéâtre ») | Usage |
|---|---|---|---|
| `ink` | bleu nuit `oklch(0.25 0.06 267)` | clair | Structure, texte fort, écusson |
| `primary` | bleu institutionnel `oklch(0.47 0.18 266)` | `oklch(0.68 0.15 266)` | Actions, aujourd'hui, liens. **Deviendra la couleur de l'établissement** (lot 3). |
| `gold` | or patiné `oklch(0.72 0.12 80)` | `oklch(0.8 0.11 82)` | Repères et distinctions, avec parcimonie |
| `background` | `oklch(0.958 0.009 262)` + dégradé très léger | bleu nuit profond | Canevas, jamais blanc pur |
| `card` / `surface` | blanc cassé / gris bleuté | bleu nuit éclairci | Surfaces, champs |
| `success` / `warning` / `destructive` | vert sauge / ambre / rouge brique | versions éclaircies | États (terminé, en cours, retard/erreur) |

Le canevas porte trois halos très diffus (bleu, or, bleu nuit) : ils donnent de la profondeur et un sens à l'effet de verre, sans jamais passer derrière du texte à pleine intensité.

Les matières gardent leur couleur propre (10 teintes), toujours utilisée à 12 % d'opacité en fond de tuile et pleine sur l'icône.

## 3. Typographie

| Rôle | Police | Détails |
|---|---|---|
| Titres de page, titres de fenêtre, chiffres clés | **Fraunces** (serif variable) | 600, interlettrage serré. Touche académique, utilisée seulement pour les titres. |
| Interface, texte, tableaux | **Inter** (variable) | 14 px dans les vues denses, chiffres tabulaires pour les dates et les notes |
| Sur-titres | Inter, 12 px, majuscules, interlettrage large, couleur `gold-foreground` | Date du jour, compteurs (« 7 devoirs ») |

Les deux polices sont embarquées via `@fontsource-variable` : aucun appel externe, ce qui compte sur les réseaux lents.

## 4. Surfaces

| Classe | Quand | Rendu |
|---|---|---|
| `.glass` / `.glass-strong` | **Couches flottantes uniquement** : barre latérale, barre supérieure, navigation mobile, menus, fenêtres, notifications | Fond translucide flouté (18 à 24 px), bordure fine claire, reflet intérieur. `glass-strong` (plus opaque) pour les fenêtres et menus contenant du texte. |
| `.soft` | Cartes, indicateurs, boutons secondaires, élément sélectionné | Soft UI : reflet supérieur + ombre double très diffuse. Profondeur sans lourdeur. |
| `.soft-inset` | Champs de saisie, pistes des contrôles segmentés, bande des jours | Légèrement en creux |
| `.flat` | Tableaux, listes denses, formulaires longs | Bordure fine, aucune ombre : lisibilité maximale |

Repli automatique : si l'utilisateur demande moins de transparence (`prefers-reduced-transparency`) ou si le navigateur ne gère pas `backdrop-filter`, le verre devient opaque. Sur les téléphones modestes, le flou est limité à trois couches fixes (barre supérieure, navigation, fenêtre ouverte).

## 5. Composants

| Composant | Fichier | Notes |
|---|---|---|
| Bouton | `ui/button.tsx` | `default` (bleu, reflet + ombre colorée), `secondary` (soft), `ink`, `outline`, `ghost`, `destructive`, `link`. Tailles `sm`, `default`, `lg`, `icon`. Léger enfoncement au clic. |
| Champs | `ui/input.tsx` | `Input`, `Textarea`, `NativeSelect` (select natif : meilleure ergonomie mobile) en creux |
| Champ de formulaire | `ui/field.tsx` | Libellé, mention « facultatif », aide ou erreur, liaison ARIA |
| Carte | `ui/card.tsx` | Surface soft, en-tête compact |
| Tableau | `ui/table.tsx` | Surface plate, en-tête collant en majuscules, lignes de 52 px, survol, lignes estompées (`data-muted`) |
| Contrôle segmenté | `ui/segmented.tsx` | Piste en creux et curseur en relief, compteur optionnel, défilement horizontal sur mobile |
| Fenêtre | `ui/dialog.tsx` | Verre ; panneau glissant du bas sur mobile, centrée sur ordinateur |
| Confirmation | `ui/alert-dialog.tsx` | Médaillon d'alerte, reste ouverte tant que l'action n'a pas réussi |
| Menu | `ui/dropdown-menu.tsx` | Verre, éléments arrondis, variante destructive |
| Badge | `ui/badge.tsx` | Pastilles d'état : neutre, accent, succès, avertissement, danger |
| Notifications | `components/providers.tsx` | Sonner habillé en verre |
| États | `components/states.tsx` | Vide (médaillon illustré + point or), erreur (avec « Réessayer »), chargement (squelettes), en-tête de page |
| Coquille | `components/layout/` | Barre latérale en verre repliable, barre supérieure en verre (fil d'Ariane, Ajouter, compte), navigation mobile avec « + » central, écusson (`logo.tsx`) |

## 6. Mouvement

- 150 à 200 ms pour les états (survol, sélection), 300 ms pour la barre latérale, apparition des pages en 350 ms (`animate-rise`, léger glissement vertical).
- Jamais d'animation décorative en boucle.
- `prefers-reduced-motion` coupe toutes les animations.

## 7. Thèmes

- **Clair** par défaut, **sombre** « Amphithéâtre » (bleu nuit, pas noir), ou **système**.
- Choix mémorisé dans le navigateur ; un script appliqué avant le premier affichage évite tout flash.
- Tous les composants n'utilisent que des jetons : un composant ne doit jamais contenir de couleur codée en dur, sauf les couleurs de matière et le panneau institutionnel de connexion.

## 8. À venir

- Couleur et logo de chaque établissement (lot 3) : remplacement de `--primary` et de l'écusson, avec contrôle automatique du contraste.
- Grille de saisie de notes au clavier, calendrier et emploi du temps, recherche globale : composants créés avec les modules qui les utilisent, pour ne jamais livrer de composant décoratif.
