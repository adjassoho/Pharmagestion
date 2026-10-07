**SECS — CHARTE D'INGÉNIERIE & RÈGLES STRICTES DU PROJET**  
***Document de Référence Obligatoire***  
 *  
 Toutes les fonctionnalités et règles du document technique HTML de spécification font foi. La maquette * *OBASA-design* * sert de référence visuelle (Design System, UI/UX).*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCkJfFSqwwIgHRiywEZJWQZeZ2ao9AAD+4lyruzq+ngAA8Nr1AOH8BeZxN/IIAAAAAElFTkSuQmCC)  
**1. Les 11 Règles d'Or Non-Négociables**  
1. **La caisse n'attend jamais le réseau (Offline-First)**  
   
 Chaque encaissement ou opération de caisse doit s'écrire instantanément dans la base locale Dexie.js (IndexedDB). Aucun appel API bloquant le navigateur n'est autorisé au moment de valider la vente.  
2. **L'argent est un entier FCFA (** **Integer** **)**  
   
 Aucun type float, décimal ou flottant n'est toléré pour les montants, prix unitaires, remises et totaux. Tout calcul en FCFA est arrondi à l'entier exact (Math.round).  
3. **Le stock est un cumul de mouvements (** **stock_movements** **)**  
   
 Il est strictement interdit d'écraser directement la colonne de quantité disponible d'un produit. Le solde du stock est toujours recalculé/validé à partir de la somme de la table des mouvements de stock.  
4. **Snapshot obligatoire à la vente**  
   
 Chaque ligne de vente (sale_items) enregistre une copie exacte et figée du libellé du produit, de sa référence et de son prix unitaire au moment précis de l'encaissement.  
5. **Clé primaire UUID générée par le client**  
   
 L'identifiant de la vente est un UUID v4 produit sur le poste client dès l'initiation du panier. C'est la clé de l'idempotence qui garantit qu'une re-synchronisation ne créera jamais de doublon.  
6. **Numérotation offline sans collision**  
   
 Le numéro de facture hors-ligne suit la formule stricte {SITE_ID}-{DEVICE_ID}-{TIMESTAMP_36}-{RANDOM_3} pour éliminer tout risque de doublon entre plusieurs caisses hors-ligne.  
7. **Encapsulation stricte par la couche ** **Repositories**  
   
 Aucun composant React ou hook UI ne contacte directement Supabase ou Dexie.js. Tous les accès aux données transitent par lib/repositories.  
8. **Traçabilité et Audit Log par Triggers PostgreSQL**  
   
 L'historique et l'audit log des modifications sensibles sont gérés nativement par des déclencheurs SQL (triggers) dans Supabase, non modifiables par le code applicatif.  
9. **Pas de ** **skipWaiting** ** sauvage du Service Worker**  
   
 L'application PWA ne doit jamais forcer une mise à jour à chaud du code pendant qu'un caissier effectue une saisie ou un encaissement.  
10. **Immutabilité des ventes (Avoirs & Annulations)**  
   
 Une vente enregistrée ne se supprime jamais de la base de données. Toute annulation produit une transaction d'avoir tracé.  
11. **Conformité Fiscale e-MECeF avec Gestion Offline**  
   
 Les factures comportent la structure e-MECeF (NIM, QR Code, Groupe de taxation A/B/C/D). Si le réseau ou l'API DGI est indisponible au moment de l'encaissement, la vente est enregistrée en attente fiscale (pending_fiscal) sans bloquer la caisse, et la signature e-MECeF est transmise dès le rétablissement de la connexion.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNBCkLfE07YGfHAiAU2QtIq6DIzW7UHAMBfnGt1V8fXEwAAXrse4eQF6VhvmPsAAAAASUVORK5CYII=)  
**2. Intégration du Design System OBASA**  
- **Charte Visuelle** :  
  - Primary (Bleu OBASA) : #1D4ED8  
  - Accent (Orange Chantier) : #F97316  
  - Text (Gris Anthracite) : #1F2937  
  - Surfaces : #F8FAFC (app bg), #FFFFFF (card bg)  
- **Rendus UI** : L'AppShell, les modals, la disposition de l'écran de caisse (recherche à gauche/haut, panier et encaissement à droite), le sélecteur de site, et le mode sombre doivent respecter au pixel près l'ergonomie de la maquette validée OBASA-design.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OYQ1AABSAwY9JoICqL4Z8Ikiggn9mu0twy8wc1RkAAH9xbdVa7V9PAAB47X4A9CgEJQFjJ/EAAAAASUVORK5CYII=)  
**3. Dispositif de Tests & Validation CI/CD**  
- **Couverture Minimale Exigée** :  
  - **100%** sur la logique financière (panier, monnaie, remises, arrondis FCFA).  
  - **100%** sur la génération de la numérotation offline et l'idempotence.  
  - **100%** sur le module d'intégration e-MECeF.  
  - **> 90%** sur la file de synchronisation Outbox.  
- **Règle de Livraison** : Aucun code ne sera mergé ou déployé si un seul test unitaire Vitest ou test d'intégration Playwright échoue.  
   
   
   
   
   
## **Règles fondamentales**  
   
1. Le nom officiel du logiciel est **Obasa**. Ne jamais afficher « SECS » dans l’interface, les factures, les notifications, les exports ou les fichiers visibles par l’utilisateur.  
2. Utiliser exclusivement la stack validée : **Next.js, React, TypeScript, Tailwind, shadcn/ui, Serwist, Dexie, Zustand, TanStack Query, Supabase Cloud, PostgreSQL, Vitest et Playwright**.  
3. Ne jamais introduire NestJS, Prisma, Drizzle, Redis, VPS, MinIO, autre base de données ou autre hébergement sans demande explicite du responsable technique.  
4. Ne jamais remplacer une technologie validée par une alternative simplement parce qu’elle semble plus rapide ou plus moderne.  
5. Ne jamais inventer une règle métier, un rôle, un champ, une API, une table ou une donnée fiscale. En cas d’ambiguïté bloquante, arrêter l’implémentation et demander une clarification.  
6. Ne jamais modifier une fonctionnalité existante sans vérifier ses dépendances, ses tests et ses impacts sur la caisse, les stocks, la fiscalité et la synchronisation.  
7. Chaque modification doit être petite, traçable, documentée et réversible.  
8. Ne jamais supprimer physiquement une vente, un mouvement de stock, une facture ou une trace d’audit. Utiliser l’annulation, l’avoir, l’ajustement ou le soft delete approprié.  
   
## **Architecture et code**  
   
9. Respecter strictement TypeScript en mode strict. Aucun any non justifié, aucun contournement de typage et aucun @ts-ignore sans commentaire technique obligatoire.  
10. Les composants React ne doivent jamais appeler directement Supabase. Tous les accès passent par lib/repositories.  
11. Toute logique métier sensible doit être protégée côté serveur et côté base de données, jamais uniquement dans l’interface.  
12. Toute migration PostgreSQL doit être versionnée dans supabase/migrations et testée sur Supabase local avant intégration.  
13. Toutes les permissions doivent être contrôlées par **RLS Supabase**, les rôles et les permissions en base, et une vérification applicative.  
14. Aucun secret, token, clé e-MECeF, clé Supabase privée ou variable sensible ne doit être exposé au navigateur ou commité dans Git.  
15. Utiliser des schémas Zod partagés pour valider les formulaires, les API, les imports Excel et les données synchronisées.  
16. Utiliser Africa/Porto-Novo comme fuseau métier officiel.  
17. L’interface v1 est exclusivement en français.  
18. Toute nouvelle fonctionnalité doit être responsive, accessible au clavier, utilisable au tactile et compatible avec les appareils ciblés.  
   
## **Règles de caisse et d’argent**  
   
19. La caisse ne doit jamais attendre le réseau pour valider une vente.  
20. Toute vente doit être enregistrée localement dans IndexedDB avant toute tentative de synchronisation.  
21. Toute vente doit recevoir un UUID côté client servant de clé d’idempotence.  
22. Un retry réseau ne doit jamais créer une deuxième vente.  
23. Tous les montants en XOF doivent être stockés comme des entiers. Aucun float pour les prix, totaux, remises ou monnaies rendues.  
24. Une facture doit conserver le snapshot du nom, de la référence, du prix, de la quantité et de la TVA au moment de la vente.  
25. Une vente sans stock renseigné, avec stock nul ou négatif, ne doit jamais être bloquée. Afficher uniquement un avertissement.  
26. Une vente validée ne doit jamais être modifiée. Toute correction passe par un avoir ou une opération compensatoire.  
27. Le panier doit être persistant et récupérable après fermeture de l’application, panne, perte réseau ou redémarrage.  
28. Les sessions de caisse doivent enregistrer le site, le poste, le caissier, les horaires, le fond initial, les montants théoriques, les montants comptés et les écarts.  
   
## **Offline, synchronisation et multi-sites**  
   
29. Obasa doit fonctionner offline pour la recherche, le panier, l’encaissement, la génération PDF et l’historique local.  
30. Utiliser Dexie et IndexedDB pour les données locales, Serwist pour le cache et une outbox pour les écritures en attente.  
31. Les ventes, produits, mouvements et inventaires doivent avoir un statut de synchronisation explicite.  
32. La synchronisation doit utiliser des retries avec backoff exponentiel, journaliser les erreurs et ne jamais perdre silencieusement une donnée.  
33. Les sites, postes et utilisateurs doivent être séparés par site_id, poste_id et utilisateur_id.  
34. Chaque poste doit posséder un préfixe de facture unique.  
35. Le stock doit être calculé à partir de la somme des mouvements, jamais à partir d’une quantité écrasée directement.  
36. Les conflits de stock doivent être résolus par addition des mouvements, jamais par remplacement arbitraire.  
37. Les changements de prix doivent respecter la règle serveur gagnant et conserver l’ancien prix dans les ventes déjà enregistrées.  
38. L’interface doit toujours afficher clairement l’état : à jour, synchronisation en cours, hors ligne, ventes en attente ou erreur de synchronisation.  
39. Ne jamais activer une mise à jour automatique de l’application pendant qu’un panier est ouvert ou qu’une vente est en cours.  
   
## **Fiscalité e-MECeF**  
   
40. Le client est assujetti à la TVA : l’intégration e-MECeF est obligatoire dans la v1.  
41. La normalisation e-MECeF doit avoir une file d’attente séparée de la synchronisation générale.  
42. Une facture offline doit être marquée **« en attente de normalisation e-MECeF »**, jamais comme normalisée.  
43. Conserver le payload envoyé, la réponse reçue, le code fiscal, le QR code, le statut, le nombre de tentatives et les erreurs.  
44. Gérer séparément les erreurs temporaires, les erreurs définitives, les expirations de token et les réponses invalides.  
45. Ne jamais générer ou inventer un code e-MECeF ou un QR code officiel.  
46. La mise en production est interdite tant que le parcours e-MECeF nominal, offline, en erreur et en reprise n’est pas testé et validé.  
   
## **Sécurité et traçabilité**  
   
47. Toute action sensible doit être journalisée : création, modification, annulation, remise, changement de prix, import, export, impression, connexion, échec PIN et synchronisation.  
48. L’audit log doit être immuable et alimenté autant que possible par des triggers PostgreSQL.  
49. Les mots de passe et PIN doivent être hachés avec une méthode sécurisée, jamais stockés en clair.  
50. Appliquer HTTPS, RLS, validation serveur, limitation des tentatives, protection XSS, CSRF, injections SQL et téléversements malveillants.  
51. Un caissier ne doit jamais voir les prix d’achat, les marges, les rapports financiers complets ou les fonctions d’administration.  
52. Tout fichier importé doit être contrôlé par taille, extension, type MIME réel et contenu.  
53. Les données personnelles doivent être limitées au strict nécessaire et supprimables selon les règles validées.  
   
## **Tests et livraison**  
   
54. Toute nouvelle fonctionnalité doit être accompagnée de tests unitaires, d’intégration ou E2E selon son niveau de risque.  
55. Tester obligatoirement les calculs XOF, les remises, la TVA, les marges, la génération de références, l’idempotence et les permissions.  
56. Tester les parcours offline avec réseau coupé, reconnexion, fermeture brutale, redémarrage et répétition de synchronisation.  
57. Tester les scénarios multi-sites et multi-postes simultanés avant toute validation.  
58. Aucun ticket n’est terminé sans preuve de test reproductible.  
59. Aucun merge n’est autorisé si TypeScript, lint, tests, build, migration, sécurité ou E2E critique échoue.  
60. Aucun déploiement en production ne doit être effectué directement depuis une branche de travail.  
61. Chaque phase doit disposer d’un rapport de tests, d’un seed reproductible et d’un critère de sortie validé.  
62. L’agent doit vérifier l’impact de chaque modification sur la caisse avant de toucher au code partagé.  
63. L’agent ne doit jamais déclarer une fonctionnalité « terminée », « sécurisée » ou « conforme » sans test réellement exécuté.  
64. En cas d’échec, l’agent doit expliquer la cause, proposer une correction minimale et relancer les tests concernés.  
65. En cas de doute sur une règle fiscale, une donnée comptable ou une suppression, l’agent doit s’arrêter et demander validation humaine.  
   
**Règle finale :** une fonctionnalité n’est acceptée que si elle est correcte en ligne, correcte hors ligne, sécurisée par Supabase, traçable, testée sur les appareils cibles et compatible avec e-MECeF.  
   
