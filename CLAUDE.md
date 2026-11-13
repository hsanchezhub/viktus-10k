# Viktus 10K

Application web installable (PWA) qui accompagne Victor, barbier à The Barbers Illkirch près de Strasbourg (Instagram @viktusblendz), de 645 à 10 000 abonnés d'ici fin août 2027. Hugo (le porteur du projet) est son coach : il suit sa progression et lui fait ses retours depuis un espace admin. Le coach, c'est Hugo, pas une IA : aucune IA n'est intégrée à l'appli (l'onglet Montage explique seulement à Victor comment monter ses vidéos dans l'appli Claude).

Ce fichier est la référence du projet. Lis-le en entier avant toute action, puis les fichiers de `reference/`.

## Ce qu'il y a dans ce dossier

| Fichier | Rôle |
| --- | --- |
| `reference/game-plan.md` | Le game plan complet : audit du compte, positionnement, phases, concepts, réels d'essai, montage avec Claude, stories, KPIs |
| `reference/contenu.json` | Tout le contenu de l'appli sous forme de données : phases, premières fois, 21 concepts, 8 réels d'essai, instructions et prompts de montage, règles 2026, exemples de to-do générées. C'est la source de vérité du contenu : on l'importe, on ne le réécrit pas |
| `reference/prototype.html` | Le prototype qui fonctionne déjà (un seul fichier HTML). Il fixe le parcours, la direction artistique et la logique métier (génération de la to-do du jour, série, trajectoire objectif). On le reproduit en mieux, on ne le copie pas tel quel |

## Le produit

Victor ouvre l'appli chaque matin depuis l'écran d'accueil de son iPhone. Elle lui dit quoi faire aujourd'hui, lui donne les idées et les prompts prêts à copier, et enregistre sa progression. Hugo voit tout depuis l'onglet Coach.

### Les 6 écrans (repris du prototype)

1. **Aujourd'hui** : jour X et semaine, phase en cours, série de jours, mot du coach, to-do du jour cochable (générée selon le jour de la semaine et la phase), les premières fois restantes, jauge de l'objectif de la phase.
2. **Plan** : audit, 4 phases et leurs portes, nom de profil et bio à copier, stories à la une, mix des 5 buts SPARTA, semaine type, méthode MEP, règles 2026 sourcées, fil rouge coulisses.
3. **Idées** : 21 concepts filtrables par but, 8 réels d'essai, boutons Copier le hook et Copier la légende.
4. **Montage** : setup Claude, instructions du projet Montage Viktus et 6 prompts à copier, kit 4 plans, schéma de la zone sûre, checklist avant publication.
5. **Suivi** : courbe abonnés réels contre trajectoire objectif, saisie hebdomadaire des abonnés, carnet des hooks (gagnant marqué si vues à 72 h supérieures ou égales à 2 fois la médiane récente, soit environ 6 900), premières fois, revue du mois.
6. **Coach** (rôle coach uniquement) : série, % de tâches faites sur 7 jours, publications de la semaine, abonnés contre objectif du jour, dernière activité avec alerte au-delà de 3 jours, heatmap des 28 derniers jours, derniers hooks, édition du mot du coach et forçage de la phase.

### Ce que la vraie appli ajoute au prototype

- **Comptes et rôles** : Victor (créateur) et Hugo (coach), connexion par lien magique e-mail. Victor ne voit que ses données, le coach voit tout.
- **Notifications push** (iOS les accepte pour une appli ajoutée à l'écran d'accueil) : rappel du matin avec la to-do, rappel de publication les jours de post, rappel du dimanche pour le montage, relance si aucune activité depuis 2 jours. Le coach peut envoyer un message push à Victor.
- **Mode hors ligne** : la to-do du jour et les contenus restent consultables sans réseau, les cases cochées se synchronisent au retour.
- **Contenu en données** : phases, concepts, prompts et règles vivent dans des fichiers de contenu ou des tables, pas dans les composants. Le coach peut ajouter un concept sans toucher au code. Ça permettra aussi de dupliquer l'appli pour un autre créateur plus tard (hors périmètre V1).

## Logique métier à reproduire exactement

Elle est dans le `<script>` de `reference/prototype.html` (fonctions `tasksFor`, `dayPct`, `streak`, `targetAt`, `phaseByDate`, `weekOf`). Les sorties attendues sont dans `reference/contenu.json`, clé `exemplesTodo` : sers-t'en comme tests.

- Début du programme : lundi 16 novembre 2026. Fuseau : Europe/Paris, toujours (une date = un jour calendaire à Paris).
- Phases : 1 du 16 nov. au 20 déc. 2026, 2 du 21 déc. 2026 au 28 févr. 2027, 3 du 1er mars au 31 mai 2027, 4 du 1er juin au 31 août 2027. Le coach peut forcer la phase.
- La to-do dépend du jour de la semaine, de la phase et du numéro de semaine (réel d'essai du mercredi dès la semaine 2, carrousel une semaine sur deux en phase 2, etc.), plus le 20 et le 5 du mois (vente) et le 1er (revue du mois).
- Série : nombre de jours consécutifs à 60 % de tâches faites ou plus ; un jour sans tâche ne casse pas la série ; le jour en cours ne la casse pas tant qu'il n'est pas fini.
- Trajectoire objectif : interpolation linéaire entre les points de `programme.trajectoireObjectif`.

## Stack recommandée

À confirmer en mode plan avant de coder. Si tu proposes autre chose, explique pourquoi.

- **Next.js** (App Router) + **TypeScript** strict + **Tailwind CSS**
- **Supabase** : authentification par lien magique, Postgres, règles d'accès par ligne (RLS)
- **PWA** : manifest, icônes, écran de démarrage iOS, service worker (cache hors ligne), Web Push
- **Déploiement Netlify** (fonctions planifiées pour les rappels push)
- **Tests** : Vitest pour la logique métier, Playwright en viewport iPhone pour les parcours

### Modèle de données de départ

- `profiles` : id, role (`creator` | `coach`), nom, compte Instagram
- `programs` : id, creator_id, date de début, phase forcée, mot du coach
- `day_logs` : creator_id, date, tâches cochées (jsonb), mis à jour le
- `firsts` : creator_id, clé, cochée le
- `follower_stats` : creator_id, date, abonnés
- `hooks` : id, creator_id, date, type (reel, essai, carrousel), hook, vues, partages, abonnés gagnés
- `push_subscriptions` : user_id, endpoint, clés
- Contenu (phases, concepts, réels d'essai, prompts, règles, premières fois) : importé depuis `reference/contenu.json`

Point de départ connu : 645 abonnés relevés le 12 novembre 2026.

## Direction artistique

Reprendre celle du prototype, en plus abouti :

- Sombre par défaut, thème clair complet. Tokens : fond #131217, surface #1c1a22, texte #f4f2f7, accent rose #ff4f8b (#d3226a en clair)
- Typo : Anton pour les titres en capitales, Manrope pour le texte, IBM Plex Mono pour les labels et les chiffres
- Signature : la jauge « fondu » (dégradé du transparent vers l'accent), utilisée pour toutes les progressions
- Mobile d'abord (iPhone, 375 à 430 px), barre d'onglets en bas, zones sûres iOS respectées, gros boutons au pouce
- Micro-interactions sobres : case cochée, journée validée, nouvelle série. Rien qui ralentit

## Règles

- Toute l'interface est en français, tutoiement, ton direct et simple
- Aucun tiret long (le caractère « — ») dans les textes de l'appli
- Ne jamais mentionner Uppercut dans l'appli pour l'instant
- Aucun secret dans le dépôt : `.env.local` ignoré par git, `.env.example` documenté
- Accessibilité : contrastes AA, focus visibles, cibles tactiles de 44 px minimum
- Ne pas inventer de chiffres : les données de l'audit sont celles de `reference/`

## Ordre de construction

Construis étape par étape. À la fin de chaque étape : tests verts, rendu vérifié en viewport iPhone, résumé de ce qui a été fait, puis attends mon feu vert.

1. **Socle** : projet, design tokens, layout mobile, barre d'onglets, PWA installable, écrans Plan, Idées et Montage alimentés par `contenu.json`
2. **Comptes et données** : Supabase, lien magique, rôles, RLS, écran Aujourd'hui (to-do du jour, premières fois), écran Suivi (abonnés, carnet des hooks), logique métier testée contre `exemplesTodo`
3. **Coach** : écran Coach complet
4. **Notifications** : abonnement push, rappels planifiés, message du coach
5. **Mise en ligne** : déploiement Netlify, domaine, test d'installation sur un vrai iPhone, import des données saisies par Victor dans le prototype s'il l'a déjà utilisé

## Pistes pour une V2 (ne pas construire en V1)

- Relevé automatique des abonnés et des stats via l'API Instagram (compte professionnel + app Meta), à vérifier
- Plusieurs créateurs par coach

## Décisions du 12 novembre 2026 (priment sur le reste du fichier)

Prises avec Hugo au lancement de la construction. Quand une ligne plus haut dit autre chose, c'est cette section qui a raison.

- **Un site, pas une appli.** Site statique hébergé sur GitHub Pages, dépôt public sur le compte `hsanchezhub`, adresse `hsanchezhub.github.io/viktus-10k/`, sans nom de domaine. Victor le pose sur son écran d'accueil : c'est ce qui permet les notifications sur iPhone.
- **Stack** (choix de Claude, Hugo n'a pas d'avis technique) : Vite + React + TypeScript strict + Tailwind 4 + Motion (ex Framer Motion) + React Router. Ni Next.js ni Netlify : tout est derrière la connexion, un rendu serveur n'apporterait rien, et GitHub Pages ne sert que des fichiers. Supabase arrive à l'étape 2 (comptes, données, règles d'accès, rappels planifiés).
- **Connexion** : e-mail et mot de passe, choisi par chacun à la création de son compte. Ni lien magique ni code par e-mail : sans nom de domaine, Supabase n'envoie d'e-mails qu'aux membres du projet, donc pas à Victor. La création de compte est réservée aux adresses invitées (table `invitations`), l'invitation fixe le rôle et expire au bout de 7 jours. Mot de passe oublié : pas de réinitialisation par e-mail, Hugo le remet à zéro depuis le tableau de bord Supabase.
- **Direction artistique « Vitrine de nuit »**, validée « pour le moment » par Hugo, qui veut avant tout un dashboard en verre et très stylé. Verre fumé, néon rose, chrome. Tokens du prototype conservés, sauf le texte secondaire (`#b5b1c1`) et le rose en petit texte (`#ff8fb3`), éclaircis pour tenir le contraste AA sur le verre. Vrai flou réservé aux barres et aux feuilles ; les panneaux sont translucides sans flou. Signature : le halo rose du fond monte avec la progression vers l'objectif de la phase. Tout vit dans `src/styles/index.css`.
- **Montage avec Claude Code sur ordinateur**, pas avec l'appli Claude et un Projet. Victor a un ordinateur et un abonnement Claude payant (Hugo s'en occupe). Les textes de montage de `content/` sont adaptés : dossiers rushes et exports, message d'installation qui crée le CLAUDE.md du dossier de Victor. À faire relire par Hugo. `reference/contenu.json` reste l'original, intact.
- **Contenu** : `content/contenu.json` et `content/complement.json` sont la source vivante. Leur structure est vérifiée par `src/content/content.test.ts`, pas dans le navigateur.
- **Phase forcée** (choix de Claude, expliqué à Hugo, à confirmer) : la to-do suit le rythme de la phase forcée à partir du jour où le coach la force, sans toucher aux jours passés. Le prototype ne changeait que l'affichage.
- **Calendrier** : Victor démarre le lundi 16 novembre 2026 sur la vraie version. Les étapes 1 et 2 doivent être en ligne avant.
- **Vidéo tuto**, en dernière étape : voix de synthèse, 3 minutes maximum, une version verticale et une version horizontale.
- **Nom du site** : « Viktus Barber · Objectif 10K abonnés » (demande d'Hugo). Le nom vit dans `content/complement.json` (`site`), répété en dur dans `index.html` et `public/manifest.webmanifest`. Le dossier et l'adresse gardent `viktus-10k`.
- **Coaching** (demande d'Hugo) : depuis son compte, Hugo écrit des retours à Victor, sous forme de messages. Victor reçoit une notification « Nouveau message de ton coach » et retrouve les messages sur le site. C'est le cœur de l'onglet Coach, avant les statistiques.
- **Instagram connecté** (demande d'Hugo, sorti des pistes V2) : Victor connecte son compte Instagram, le site relève tout seul ses abonnés et les chiffres de ses reels et de ses stories, et les compare au plan. Voir le détail ci-dessous.

### Instagram connecté : ce que la doc de Meta permet (lue le 12 novembre 2026)

Source : documentation « Instagram API with Instagram Login » sur developers.facebook.com.

- **Conditions** : compte Instagram professionnel (créateur ou entreprise), sans page Facebook. Une application Meta créée par Hugo, laissée en mode développement, avec le compte de Victor ajouté dessus : pas de validation par Meta tant qu'elle ne sert que des comptes ajoutés à l'application. La doc prévient que certaines fonctions peuvent être limitées dans ce mode : à confirmer par un vrai appel avant de s'engager.
- **Permissions** : `instagram_business_basic` et `instagram_business_manage_insights`.
- **Jeton** : valable 60 jours, à renouveler automatiquement. L'échange et le renouvellement demandent le secret de l'application, donc ils se font côté Supabase, jamais dans le navigateur.
- **Disponible** : nombre d'abonnés ; par reel : vues, comptes touchés, partages, enregistrements, likes, commentaires, durée moyenne de visionnage ; par story : vues, comptes touchés, réponses, navigation.
- **Limites** : chiffres des stories lisibles seulement pendant leurs 24 h de vie, et pas du tout sous 5 spectateurs ; pas d'alerte automatique de Meta avec ce mode de connexion, donc on relève toutes les heures et on garde le dernier chiffre. Meta annonce jusqu'à 48 h de retard sur certains chiffres : « temps réel » veut dire « rafraîchi toutes les heures ». Rien dans la doc sur la lecture des réels d'essai : à tester, saisie à la main en secours. Pas de chiffres par photo à l'intérieur d'un carrousel.
- **Ce que l'API ne sait pas** : le hook affiché à l'écran. Victor associe chaque reel à un hook du carnet, le reste est automatique.

### Ordre de construction, mis à jour

1. Socle (fait)
2. Comptes et données : Supabase, connexion par code, Aujourd'hui, Suivi avec saisie à la main
3. Coaching : messages d'Hugo, écran Coach
4. Notifications : nouveau message du coach, rappels, hors ligne
5. Instagram connecté : relevés automatiques qui remplacent la saisie à la main
6. Livraison : test sur vrai iPhone, import du prototype
7. Vidéo tuto

### Où on en est

- **En ligne** depuis le 12 novembre : https://hsanchezhub.github.io/viktus-10k/ (dépôt public `hsanchezhub/viktus-10k`). Chaque envoi sur `main` relance les tests puis la mise en ligne (`.github/workflows/deploy.yml`). L'adresse et la clé publique Supabase sont des variables du dépôt GitHub.
- **Étape 1, socle** : validée par Hugo.
- **Étape 2, comptes et données** : faite. Connexion, Aujourd'hui, Suivi, réglages. Vérifiée en vrai : Hugo a créé son compte coach.
- **Étape 3, coaching** : faite et en ligne. L'accueil du coach est l'écran Coach : chiffres clés, messages à Victor (avec « Lu » ou « Pas encore lu »), to-do du jour en lecture seule, 28 derniers jours, phase forcée, derniers hooks. Côté Victor, le dernier message s'affiche en haut d'Aujourd'hui (« Le mot de Hugo »), avec l'historique. Hugo et Victor ont chacun leur compte, reliés par un programme (relu dans la base le 13 novembre). Aucun message n'a encore été envoyé.
- **Supabase** : projet `viktus-10k` (référence `jcyufnhhfgfinoaapsha`, région Paris, offre gratuite), géré via le connecteur Supabase de Claude (déclaré dans `.mcp.json`). Migrations dans `supabase/migrations/`. Règles d'accès vérifiées par `supabase/tests/*.sql`, à rejouer après chaque migration. « Confirm email » est désactivé (sinon la création de compte est refusée).
- **Étape 4, notifications et hors ligne** : faite et en ligne depuis le 13 novembre. Côté Supabase : migration `0003_notifications` appliquée, fonction `push` déployée (sans vérification de JWT), clés d'envoi créées, tâche `viktus-rappels` planifiée à chaque heure pile. Voir « Étape 4 : ce qui a été installé et vérifié » plus bas.
- **Pas encore vérifié** : le rendu sur un vrai iPhone, et l'arrivée d'une vraie notification sur un téléphone (le chiffrement et l'envoi vers Apple n'ont jamais tourné en vrai). Les parcours automatiques tournent sur un backend en mémoire (`VITE_BACKEND=memory`), pas sur Supabase.

### Étape 4 : comment c'est fait

- **Hors ligne.** Un service worker (`service-worker/sw.js`, complété à la construction par `service-worker/plugin.ts`) garde la page, son code et ses polices : le site s'ouvre sans réseau. Les données lues sont gardées une semaine dans le navigateur (`viktus:cache`). Une écriture du suivi est une simple donnée (`src/data/trackingWrites.ts`) : sans réseau elle attend, même site fermé, puis part au retour du réseau. Le dernier compte connecté est retenu (`viktus:account`) pour ouvrir le site sans réseau. Les actions du coach, elles, échouent tout de suite hors ligne.
- **Notifications côté site** (`src/features/notifications/`). Seul le créateur en reçoit. Invitation à les activer sur Aujourd'hui, interrupteur dans les Réglages. Sur iPhone, elles n'existent que si le site est ouvert depuis l'écran d'accueil : l'écran l'explique. Se déconnecter désabonne l'appareil.
- **Envoi** (`supabase/functions/push/`, migration `0003_notifications.sql`). La base « sonne » la fonction `push` à chaque nouveau message du coach (déclencheur) et à chaque heure pile (pg_cron), avec un jeton que seule la base connaît. La fonction chiffre et envoie elle-même (Web Push, sans dépendance), avec des clés qu'elle crée à son premier appel et qui ne sortent pas de la base. Elle réutilise les règles de la to-do du site (`src/domain`).
- **Rappels** (heure de Paris, choix de Claude, à confirmer par Hugo) : to-do du matin à 8 h, qui devient une relance après 2 jours pleins sans rien saisir ; rappel de publication à 18 h s'il reste une publication à cocher ; rappel de montage le dimanche à 17 h si la session n'est pas cochée. Deux au plus par jour, un seul envoi par type et par jour (table `push_sent`).
- **Écrans de démarrage iPhone** : `public/splash/`, générés avec les icônes (`npm run icons`).

### Étape 4 : ce qui a été installé et vérifié (13 novembre 2026)

- **Migration** `0003_notifications` : essai à blanc sans erreur, puis appliquée. Contrôlé par lecture : les trois tables `push_*` ont leurs règles d'accès, un compte connecté ne lit que `public_key` dans `push_server`, rien n'est ouvert sans connexion, la sonnette n'est appelable ni par `anon` ni par `authenticated`.
- **Fonction `push`** : déployée depuis `supabase/.bundle/push/index.js` (`npm run build:function`), relue une fois en place. Elle répond 204 à la base (création des clés, puis passage « rappels ») et 401 à un appel sans jeton ou avec un mauvais jeton.
- **Scripts de test** : `acces.sql` passe (lancé par Claude). `coaching.sql` et `notifications.sql` passent aussi, mais lancés par Hugo dans l'éditeur SQL de Supabase : c'est lui qui a lu le résultat. `acces.sql` a été corrigé au passage : il attendait encore que les invitations soient illisibles depuis le site, ce qui n'est plus vrai depuis le coaching (un coach lit les siennes).
- **Tâche planifiée** `viktus-rappels` : présente et active dans `cron.job`.

Ce qu'il faut savoir pour la suite :

- **Confirmation Supabase.** Le connecteur laisse passer sans rien demander les lectures, les migrations simples et les scripts sans suppression. Dès qu'un texte SQL contient un `delete` ou un `drop` (donc `coaching.sql`, `notifications.sql`), il exige une confirmation à l'écran. Dans une conversation lancée par une autre conversation, cette fenêtre ne s'affiche pas et l'appel revient « declined ». Dans ce cas : copier le script (`pbcopy`), ouvrir l'éditeur SQL du tableau de bord (`https://supabase.com/dashboard/project/jcyufnhhfgfinoaapsha/sql/new`) et demander à Hugo de coller puis de cliquer sur Run. Ne pas réécrire le script pour contourner la confirmation.
- **Conseils de sécurité de Supabase**, relevés après l'installation :
  - `pg_net` est enregistrée dans le schéma `public` (ses fonctions vivent dans `net`, rien n'est exposé). Correction prête mais pas appliquée, car elle demande la confirmation décrite ci-dessus : une migration `0004` avec `drop extension pg_net; create extension pg_net with schema extensions;`. Rien n'en dépend en dur.
  - `push_sent` a ses règles d'accès activées sans aucune règle : c'est voulu, seule la fonction y touche.
  - La protection contre les mots de passe compromis est désactivée (réglage d'authentification, antérieur à cette étape).
- **Détail sans gravité** : un coach peut remplir lui-même `notified_at` en écrivant un message directement dans la base, ce qui empêcherait seulement sa propre notification de partir.

Reste à faire, avec Hugo et Victor : Victor ouvre le site depuis l'écran d'accueil de son iPhone et active les notifications, Hugo lui envoie un message depuis l'écran Coach, Victor doit recevoir « Nouveau message de ton coach ». En cas d'échec, regarder `net._http_response` et les journaux de la fonction `push`.

### Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Site en local |
| `npm test` | Tests unitaires |
| `npm run e2e` | Parcours sur iPhone (WebKit) et ordinateur, sur le site construit sous `/viktus-10k/` |
| `npm run lint`, `npm run typecheck`, `npm run format` | Qualité du code |
| `npm run captures -- etape-N` | Captures dans `captures/etape-N/` |
| `npm run icons` | Régénère les icônes et les écrans de démarrage iPhone |
| `npm run build:function` | Assemble la fonction Supabase `push` dans `supabase/.bundle/` |

### Pièges de cette machine

- L'aperçu intégré de Claude n'a pas accès au Bureau : lancer `npm run dev -- --port 5183 --strictPort` depuis l'outil terminal, puis ouvrir `http://localhost:5183`.
- Les captures passent par le Chromium complet : le WebKit de Playwright et son Chromium allégé ne dessinent pas le flou du verre dans une capture.
- Pas de Xcode complet, donc pas de simulateur iPhone : le rendu dans le vrai Safari se vérifie sur un vrai iPhone.
