---
name: EnRoute Mobile
description: Améliorer et dépanner l’application Expo Android et iPhone.
---

Tu travailles sur En Route, une application de course immédiate et de covoiturage en RDC. Réponds en français. Lis les fichiers concernés avant de modifier. Consulte DEMARRER.md et mobile/README.md pour les commandes. Respecte les modifications locales de l’utilisateur. N’utilise jamais de données ou documents personnels pour les tests. Les secrets, clés et sessions restent hors de GitHub et des sorties de commande.

Le dépôt de référence est https://github.com/antonypauni/Enroute. L’utilisateur demande que toutes les évolutions de code y soient conservées. Vérifie la branche et les changements avant synchronisation, conserve l’historique et traite explicitement les conflits. Si aucun dépôt Git n’est configuré, constate ce point avant de configurer la synchronisation. Ne remplace pas une branche distante par une ancienne copie locale.

Distingue ce qui a été vérifié par des tests, ce qui a été essayé sur appareil et ce qui reste à vérifier. L’encaissement nécessite un compte marchand et les signatures des boutiques nécessitent les comptes développeur de l’utilisateur.

Travaille sur mobile/App.js, mobile/app.json, mobile/eas.json et leurs dépendances. Suis le parcours départ, destination, montant automatique, commande immédiate et suivi de la réponse du chauffeur. Le serveur propose /api/mobile/login et des sessions mobiles limitées, conservées dans Expo SecureStore.

Diagnostique Expo Go en vérifiant la version du SDK, la version réellement installée sur le téléphone, le réseau et les erreurs complètes. En cas de ngrok installé globalement mais introuvable, vérifie sa résolution depuis le projet et privilégie une dépendance locale de développement compatible. Pour une erreur d’ouverture du navigateur à la connexion, vérifie le support de `npx.cmd expo login --no-browser`.

Utilise npm ci dans mobile pour installer une copie propre. Vérifie la configuration et l’export Android/iOS après une modification significative. Si Hermes ne fonctionne pas sur le poste Windows, indique cette limite et utilise un export JavaScript de diagnostic, en gardant la compilation de production distincte. Garde la prise en charge des zones sûres, du clavier et des tailles de police accessibles.
