# Connecter un compte marchand à En Route

Moyens souhaités : M-Pesa, Airtel Money, Orange Money, AfriMoney et carte bancaire. Ils sont affichés côté client, mais les moyens électroniques restent désactivés tant que leur intégration n’est pas active.

## Ouvrir le compte

Une option documentée est Moko Afrika / Freshpay : https://docs.gofreshpay.com/en/ . Sa documentation annonce les quatre réseaux Mobile Money, Visa/Mastercard et des opérations de collecte et de versement Mobile Money. Demandez au service marchand l’ouverture et la validation de votre compte En Route, l’activation des réseaux voulus, les devises CDF/USD, les tarifs, les limites et l’accès de test puis de production.

Autre piste officielle : FlexPaie, dont le site https://flexpaie.com/ propose l’inscription aux API. Faites confirmer la liste exacte des réseaux et les fonctions de versement disponibles sur votre contrat.

## Raccordement au serveur

Une fois le prestataire retenu, l’intégration doit être finalisée avec sa documentation : création du paiement, confirmation signée, vérification du statut auprès du prestataire, traitement des doublons, remboursement si applicable, versements chauffeur et rapprochement du registre.

Les clés privées doivent rester dans les variables sécurisées du serveur. Ne les publiez jamais dans GitHub, dans le code mobile, dans un ZIP ou dans le chat. Aucun simple numéro de portefeuille ne remplace une connexion API marchand.

## Validation avant activation

Vérifier en environnement de test : paiement réussi, refusé ou expiré, confirmation reçue plusieurs fois, reprise après coupure, montant/devise/référence, versement chauffeur et réconciliation du bilan journalier. Ne collecter aucune donnée de carte directement dans les serveurs En Route : utiliser la page de paiement hébergée du prestataire.

Le serveur En Route refuse un statut payé envoyé par un client. Les courses électroniques ne peuvent être acceptées que sur confirmation de paiement provenant du serveur. Tant que la connexion marchand n’est pas finalisée, les clients peuvent commander en espèces ; un chauffeur ayant atteint le seuil des espèces devra régulariser sa commission pour reprendre les courses en espèces.
