# Lancer le projet dans Claude Code

## Avant de commencer (15 minutes)

1. Mets ce dossier `viktus-10k` là où tu ranges tes sites (par exemple dans `Claude Code/Sites & Agence/`).
2. Crée les comptes dont l'appli aura besoin :
   - **Supabase** (gratuit pour démarrer) : un projet « viktus-10k », région Europe.
   - **Netlify** : tu l'as déjà.
3. Ouvre Claude Code dans le dossier `viktus-10k`. Il lit `CLAUDE.md` tout seul.
4. Passe en **mode plan** pour le premier message : Claude Code propose son plan sans rien coder, tu valides, puis il construit.

## Le premier message à coller

```
Lis CLAUDE.md en entier, puis les trois fichiers de reference/ (game-plan.md, contenu.json, prototype.html).

On construit la vraie version de Viktus 10K : une PWA installable sur iPhone, carrée, rapide, belle, qui reprend tout le prototype et ajoute les comptes, le suivi coach, les notifications push et le hors ligne.

Avant de coder :
1. Résume-moi en 10 lignes ce que tu as compris du produit et de la logique métier.
2. Confirme ou challenge la stack recommandée.
3. Propose l'arborescence du projet, le schéma de base de données avec les règles d'accès, et le découpage en étapes.
4. Pose-moi toutes les questions qui bloquent (nom de domaine, e-mails des comptes, clés à créer).

Ensuite on construit étape par étape, comme écrit dans CLAUDE.md. À chaque fin d'étape : tests verts, captures en viewport iPhone, et tu attends mon feu vert.
```

## Pendant la construction

- **Une étape à la fois.** Tu testes sur ton téléphone à chaque fin d'étape avant de dire « go ».
- **Les clés** (Supabase) vont dans `.env.local`, jamais dans un message ni dans le code. Claude Code te dira lesquelles créer.
- **Si un rendu ne te plaît pas**, envoie une capture d'écran dans Claude Code avec ce qui ne va pas.
- **Fin de session** : demande-lui de mettre à jour `CLAUDE.md` avec ce qui a été décidé, pour que la session suivante reparte au bon endroit.

## Messages utiles pour la suite

```
Étape suivante. Rappelle-moi d'abord ce qui reste à faire dans l'étape en cours.
```

```
Fais une passe qualité sur ce qui existe : performances mobiles, accessibilité, états vides, erreurs réseau, mode hors ligne. Liste les problèmes avant de corriger.
```

```
Déploie sur Netlify et donne-moi la marche à suivre pour l'installer sur l'iPhone de Victor.
```
