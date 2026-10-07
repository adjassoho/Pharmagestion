# 🏗️ OBASA — Quincaillerie & Matériaux de Construction (PWA Offline-First)

> **Système de Caisse (POS), Gestion de Stocks Multi-Dépôts, Facturation Fiscale e-MECeF (DGI Bénin) & Traçabilité Complète.**

[![Production Deployment](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge&logo=vercel)](https://obasa-design-maquette.vercel.app)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.x-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-orange?style=for-the-badge&logo=pwa)](https://developer.mozilla.org/fr/docs/Web/Progressive_web_apps)

---

## 🌐 Liens d'Accès & Déploiement

- 🚀 **Application en Ligne (Vercel)** : **[https://obasa-design-maquette.vercel.app](https://obasa-design-maquette.vercel.app)**
- 📖 **Guide d'Utilisation Complet** : **[`docs/GUIDE_UTILISATION.md`](docs/GUIDE_UTILISATION.md)**
- 📜 **Règles d'Or & Spécifications** : **[`docs/RULES.md`](docs/RULES.md)**

---

## ✨ Fonctionnalités Majeures

- 🛒 **Point de Vente & Caisse Rapide** : Moins de 15s par vente, recherche tactile, lecteur code-barres, gestion des fonds et clôtures de caisse avec calcul automatique des écarts.
- 📦 **Catalogue & Import / Export CSV / Excel** : Ajout manuel, import en masse avec contrôle de sécurité dry-run (RFC 4180), modèle téléchargeable, export complet du catalogue en 1 clic.
- 📊 **Gestion des Stocks Multi-Dépôts** : Entrées/sorties, transferts inter-sites, alertes de rupture, autorisations de vente à stock zéro/négatif.
- 🧾 **Facturation Normalisée e-MECeF (DGI Bénin)** : Groupes de taxe A/B/C/D, signature électronique, file d'attente hors-ligne automatique et génération de factures d'avoir compensatoires.
- 👥 **Gestion d'Équipe & Sécurité Multi-Terminaux** : Rôles Gérant / Stock / Caissier, hachage des mots de passe PBKDF2, propagation multi-appareils instantanée et suppression sécurisée de comptes.
- 📴 **100% Offline-First** : Fonctionnement autonome sans Internet grâce à Dexie IndexedDB et synchronisation bidirectionnelle résiliente.

---

## 👥 Comptes de Démonstration & Profils

| Rôle | Nom | Identifiant | Mot de passe | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Gérant / Admin** | Silvère ADJASSOHO | `silvere.a` ou `silveradjassoho@gmail.com` | `obasa2026` | Accès total, paramètres fiscaux, gestion équipe, rapports |
| **Gérant Adjoint** | Ambroise Houessou | `ambroise.h` ou `ambroise@obasa.bj` | `obasa2026` | Accès total |
| **Resp. Stock** | Afiavi Koudjo | `afiavi.k` ou `afiavi@obasa.bj` | `obasa2026` | Produits, entrées/sorties, transferts, achats, fournisseurs |
| **Caissier** | Serge Adjovi | `serge.a` ou `serge@obasa.bj` | `obasa2026` | Caisse tactile, sessions, tickets, factures PDF |

---

## ⚡ Démarrage Rapide en Local

```bash
# 1. Cloner le projet
git clone https://github.com/adjassoho/OBASA.git
cd OBASA

# 2. Installer les dépendances
pnpm install

# 3. Lancer le serveur de développement
pnpm dev

# 4. Lancer la suite de tests unitaires (181 tests)
pnpm test:unit

# 5. Compiler pour la production
pnpm build
```

---

## 🛠️ Stack Technologique

- **Front-end** : Next.js 15 (App Router) + React 19 + TypeScript (Strict).
- **Offline Storage** : IndexedDB via Dexie.js 4 (Event Sourcing local).
- **Backend & Cloud Sync** : Supabase (PostgreSQL 16, Auth, Storage, Edge Functions).
- **Fiscalité Bénin** : Connecteur normalisé API e-MECeF (DGI) avec file d'attente hors-ligne.
- **Impression** : Moteur thermique ESC/POS 80mm + Générateur PDF A4 `pdf-lib` autonome.

---

*Développé pour OBASA S.A.R.L — République du Bénin.*
