# Meowdoku-like

Une recréation de **Meowdoku** (jeu mobile de puzzle logique avec des chats),
jouable sur **iOS**, **Android** et **Web** à partir d'une seule base de code
(Expo / React Native + React Native Web).

## 1. Analyse du jeu original

D'après les captures d'écran fournies (écran d'accueil, écran de partie
niveau 1 en 4×4, niveau 4 en 6×6, modale de profil, écran de série
quotidienne), voici la mécanique et les écrans identifiés.

### Le puzzle : une variante de "Star Battle" / "Queens"

La grille NxN est découpée en **N régions de couleur**. Le but est de placer
un chat 🐱 par case de façon à respecter **trois règles simultanément**,
rappelées en permanence sous forme de mini-cartes pédagogiques pendant la
partie :

1. **1 chat par couleur** — une seule région de couleur ne peut contenir
   qu'un seul chat.
2. **1 chat par ligne et colonne** — comme dans un sudoku/les échecs, une
   seule ligne et une seule colonne ne peuvent contenir qu'un seul chat.
3. **Les chats ne peuvent pas se toucher** — même en diagonale (règle du
   roi aux échecs : distance de Tchebychev ≥ 2 entre deux chats).

C'est exactement la mécanique du jeu **Queens** (popularisé par LinkedIn) :
un cas particulier de "Star Battle" à une étoile, où les régions colorées
remplacent les contraintes géométriques pures. Meowdoku l'habille d'un
thème mignon (chats, poissons, avatars d'animaux) et d'une méta-couche de
progression (niveaux, score, série quotidienne, monnaie).

**Pourquoi ça fonctionne bien**, du point de vue design :

- **Trois règles simples, apprises en 10 secondes**, mais dont la
  combinaison crée une vraie profondeur de déduction logique — la même
  formule qui a rendu Queens viral.
- **Feedback immédiat, avec un vrai enjeu** : un tap simple ne fait que
  noter/effacer une exclusion (✕), sans risque — c'est l'espace pour
  déduire. Un double-tap engage réellement un chat sur la case : correct,
  il se pose ; incorrect, la case est marquée ✕ (on sait maintenant que ce
  n'est pas là) et coûte une vie 🐟 parmi les 3 disponibles par niveau. Ce
  découplage "noter sans risque / valider avec risque" est ce qui rend la
  logique déductive gratifiante plutôt que punitive.
- **Difficulté progressive lisible** : la grille grandit avec le niveau
  (4×4 → 16×16 dans cette recréation, chaque palier de taille durant un
  niveau de plus que le précédent), donnant une sensation de progression
  sans changer les règles.
- **Boucle de méta-jeu courte** : score cumulé, poissons 🐟 (monnaie) et
  power-ups (chat auto-placé, ampoule d'indice) créent une petite économie
  qui récompense la persévérance sans bloquer la partie.
- **Rituel de rétention** : l'écran "Touchez le soleil, allumez votre
  série !" est un mécanisme de streak quotidien classique (type Duolingo),
  qui ramène le joueur chaque jour indépendamment de la difficulté du
  niveau en cours.
- **Identité ludique et non punitive** : avatars/cadres à débloquer, thème
  chaton, palette pastel chaleureuse — le jeu reste accessible et "cosy"
  même quand le puzzle devient dur.

### Écrans reconstitués

| Écran | Éléments identifiés |
|---|---|
| **Accueil** | Logo "MEOWDOKU", bouton avatar (haut gauche), bouton réglages (haut droit), carte "Défi quotidien" (verrouillée jusqu'au niveau 21), carte "Série" (streak), bouton "Niveau N" |
| **Partie** | Barre du haut (retour / Niveau / Score / réglages), badge de progression 🐱 x/N, badge vies 🐟 (3 par niveau), 3 cartes de règles, grille de jeu, deux boutons de power-up (🐱 auto-placement, 💡 indice) avec compteur de charges |
| **Profil** | Avatar + identifiant joueur, onglets Avatar/Cadre, grille de sélection, bouton Confirmer |
| **Série quotidienne** | Soleil à toucher, compteur de jours, message de confirmation |

### Interaction sur la grille

- **Tap simple** : bascule la case entre vide et exclue (✕ blanche).
  Purement une note pour le joueur, sans conséquence — c'est là qu'on pose
  ses déductions avant de s'engager.
- **Double-tap** : engage un chat sur la case. S'il y a effectivement un
  chat à cet endroit dans la solution, il se pose (🐱). Sinon, la case
  reçoit une ✕ **rouge, définitive** — elle ne peut plus jamais être
  modifiée, ni par un tap simple ni par un nouveau double-tap — et le
  joueur perd une vie parmi les 3 disponibles pour ce niveau (affichées en
  🐟 en haut de l'écran). L'erreur déclenche aussi une petite vibration
  (haptique, désactivable dans les réglages) et une légère secousse de
  l'écran. À 0 vie, le niveau est raté et propose de réessayer (nouvelle
  grille de la même taille) ou de retourner à l'accueil.
- Les power-ups (🐱 auto-placement, 💡 indice) restent des raccourcis
  payants (poissons 🐟 de la monnaie du joueur) qui ne coûtent jamais de
  vie.

## 2. Choix techniques

**Expo (React Native + React Native Web) en TypeScript** : une seule base
de code compile nativement vers iOS, Android *et* Web, ce qui correspond
exactement à la demande. Alternatives écartées : une PWA seule (pas d'app
store natif) ou deux bases séparées (natif + web) qui auraient dupliqué
toute la logique de puzzle.

- **Zustand** (+ persistance `AsyncStorage`, compatible web) pour l'état
  global : progression, score, monnaie, power-ups, série, profil,
  réglages.
- **Aucune dépendance de navigation lourde** : l'app est volontairement
  simple (Accueil ↔ Partie + modales), un switch d'écran en state React
  suffit et reste trivial à auditer.
- **Pas d'assets graphiques propriétaires** : les chats/avatars utilisent
  des emojis et des formes vectorielles simples, pour ne pas reproduire les
  illustrations protégées du jeu original tout en gardant le même esprit
  visuel (fond crème, accents bruns/orangés, cartes arrondies).

## 3. Structure du projet

```
src/
  engine/            Moteur du puzzle (pur TypeScript, sans dépendance UI)
    types.ts          Types Puzzle / CellState / Conflict
    generator.ts       Génération de puzzles à solution unique
    solver.ts           Comptage/recherche de solutions, détection de conflits
  state/
    store.ts           Store Zustand (progression, profil, réglages) + persistance
  theme/
    colors.ts           Palette de couleurs (fond, encre, accent, régions)
  utils/
    levelConfig.ts       Taille de grille par niveau, calcul du score
  components/         Composants UI réutilisables (Cell, Board, TopBar, RuleCard,
                        ProgressBadges, PowerButton, WinModal, ProfileModal,
                        StreakModal, SettingsModal)
  screens/
    HomeScreen.tsx
    GameScreen.tsx
App.tsx              Point d'entrée, bascule Accueil ↔ Partie
```

### Génération de puzzle (`src/engine/generator.ts`)

1. **Solution** : backtracking aléatoire qui place une permutation de
   colonnes (une par ligne) telle que deux chats sur des lignes
   consécutives ne soient jamais à une colonne de distance ≤ 1 (seules les
   lignes consécutives peuvent se toucher, donc c'est la seule contrainte à
   vérifier).
2. **Régions** : croissance aléatoire multi-sources (type diagramme de
   Voronoï) à partir de chaque cellule solution, avec un léger biais vers
   les régions les plus petites pour éviter des formes trop déséquilibrées.
3. **Unicité, garantie quand c'est possible dans le budget de temps** : le
   solveur (recherche avec heuristique MRV — la ligne la plus contrainte
   d'abord — pour rester praticable jusqu'à 16×16) cherche une solution
   alternative. Si elle existe, comme chaque solution valide utilise
   chaque région *exactement une fois*, voler à cette solution alternative
   une de ses cellules (en la réattribuant à une région voisine, tout en
   vérifiant que les deux régions restent connexes) invalide *cette*
   solution alternative sans jamais toucher la vraie solution. Cette
   réparation est répétée jusqu'à ce que le solveur ne trouve plus qu'une
   seule solution.
4. **Budget de temps borné par taille** (`budgetForSize` dans
   `generator.ts`) : sur les petites/moyennes grilles (jusqu'à 9×9),
   l'unicité est prouvée en quelques dizaines de millisecondes. Au-delà,
   l'espace des solutions alternatives grandit trop vite pour être
   entièrement exploré à chaque génération ; la génération part alors sur
   le meilleur agencement de régions trouvé avant l'expiration du budget,
   qui reste **toujours entièrement jouable** (la vraie solution ne
   bouge jamais) mais n'est pas garanti être *la seule* — au pire, un
   niveau très large peut exceptionnellement accepter plus d'une
   disposition valable, sans que cela casse la partie. Ce compromis garde
   la génération rapide et bornée dans le temps (jamais de blocage de
   l'interface) jusqu'à des grilles **16×16**.

## 4. Lancer le projet

```bash
npm install

npm run web       # Web (navigateur)
npm run ios       # iOS (simulateur/appareil via Expo Go ou build dev)
npm run android   # Android (émulateur/appareil via Expo Go ou build dev)
```

Pour construire des binaires natifs distribuables (App Store / Play
Store), utiliser [EAS Build](https://docs.expo.dev/build/introduction/) :

```bash
npx eas-cli build --platform ios
npx eas-cli build --platform android
```

## 5. Limites connues / pistes d'évolution

- Pas de backend : la progression est locale à l'appareil (`AsyncStorage`).
- Pas de sons/musique ni de vraies illustrations d'avatars (emojis à la
  place), pour rester dans un scope raisonnable et éviter de reproduire des
  assets protégés.
- Le défi quotidien n'est pas encore implémenté au-delà du déverrouillage
  affiché (structure prête dans `levelConfig.ts` via
  `DAILY_CHALLENGE_UNLOCK_LEVEL`).
- Le solveur d'indice se contente de révéler une cellule de la solution
  connue ; un vrai moteur de déduction logique (façon "seule case possible
  dans cette région") serait une amélioration naturelle.
- Sur les très grandes grilles (environ 11×11 et au-delà), la génération
  n'est plus garantie *strictement* unique (voir §3) — c'est un compromis
  assumé pour rester rapide jusqu'à 16×16 plutôt qu'un bug ; le niveau
  reste toujours entièrement valide et jouable.
