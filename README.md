# SenEvent

Le catalogue des événements culturels de Dakar : une application web et une application mobile qui partagent la même base Supabase et la même logique métier.

Projet pédagogique — DAWM, M1 RETEL (DMI / FST / UCAD).

## En ligne
- Application web : https://senevent-mbow.vercel.app
- Deploiement continu : chaque merge sur main met la production a jour, chaque Pull Request recoit une URL de previsualisation.

## Structure

```
apps/
  web/        SPA React + Vite (React Router), deployee sur Vercel
  mobile/     application Expo (Expo Router)
packages/
  shared/     @senevent/shared : client Supabase et fonctions metier, en TypeScript
supabase/
  migrations/ schema, RLS, trigger de profil, stockage des affiches
```

Les deux applications n'appellent jamais Supabase directement : elles passent par `@senevent/shared` (`getEvenements`, `creerEvenement`, `seConnecter`, `inscrire`…).

## Developper en local

Le depot est un monorepo npm workspaces : on installe une seule fois, a la racine.

```bash
npm install
```

Les cles publiques Supabase vont dans des fichiers non versionnes :

| Application | Fichier | Variables |
| --- | --- | --- |
| web | `apps/web/.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| mobile | `apps/mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

```bash
npm run dev --workspace apps/web     # http://localhost:5173
npm run build --workspace apps/web   # build de production dans apps/web/dist
cd apps/mobile && npx expo start     # puis Expo Go sur le telephone
```

La cle `service_role` ne doit jamais apparaitre dans ces fichiers : tout ce qui commence par `VITE_` ou `EXPO_PUBLIC_` est lisible par n'importe quel visiteur.

## Deploiement

Le projet Vercel `senevent-mbow` construit `apps/web` (Root Directory), avec les variables `VITE_SUPABASE_*` definies cote Vercel pour Production et Preview. `apps/web/vercel.json` renvoie `index.html` pour toute adresse : les liens directs comme `/evenement/3` fonctionnent. Le workflow `build-web` de GitHub Actions construit l'application sur chaque Pull Request vers `main`.

## Versions

Un tag par lab : `v0.4-spa` … `v0.10-mobile-crud`, puis `v1.0-web` pour la mise en production.
