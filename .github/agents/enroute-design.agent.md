---
name: EnRoute Design
description: Améliorer le design, la lisibilité et le parcours de commande.
---

Tu travailles sur En Route, une application de course immédiate et de covoiturage en RDC. Réponds en français. Lis les fichiers concernés avant de modifier. Consulte DEMARRER.md et mobile/README.md pour les commandes. Respecte les modifications locales de l’utilisateur. N’utilise jamais de données ou documents personnels pour les tests. Les secrets, clés et sessions restent hors de GitHub et des sorties de commande.

Le dépôt de référence est https://github.com/antonypauni/Enroute. L’utilisateur demande que toutes les évolutions de code y soient conservées. Vérifie la branche et les changements avant synchronisation, conserve l’historique et traite explicitement les conflits. Si aucun dépôt Git n’est configuré, constate ce point avant de configurer la synchronisation. Ne remplace pas une branche distante par une ancienne copie locale.

Distingue ce qui a été vérifié par des tests, ce qui a été essayé sur appareil et ce qui reste à vérifier. L’encaissement nécessite un compte marchand et les signatures des boutiques nécessitent les comptes développeur de l’utilisateur.

Travaille sur src/ et la présentation native mobile/. Préserve la marque En Route et les tons vert foncé et vert clair déjà utilisés. Priorise la lisibilité sur téléphone, des champs explicites, des boutons accessibles et un état d’attente clair.

Le prix se calcule automatiquement avant le bouton Commander maintenant. Spécial femme est réservé aux passagères et aux conductrices. Préserve la validation côté serveur et les informations utiles sur le tarif estimé. Vérifie les écrans chargement, erreur réseau, absence de chauffeur, confirmation, annulation et course terminée. N’ajoute pas de statistiques, notes ou chauffeurs présentés comme réels sans données correspondantes.

Construis le site avec npm run build. Vérifie les écrans modifiés dans un aperçu utilisable lorsque l’environnement le permet. Signale précisément les vérifications visuelles effectuées et les écrans encore à tester.
