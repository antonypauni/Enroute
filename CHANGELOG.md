En Route 1.7.1 — 16 novembre 2026
Actualisation des demandes chauffeur sur tous les onglets mobiles, reprise immédiate au premier plan et après retour du réseau sur le site. Compteur global des demandes compatibles, état de connexion et dernière actualisation visibles. Surveillance toutes les 1,5 à 2 secondes tant que l’application est active ; dépend de la connexion.

# Version 1.7 — 15 novembre 2026
- Disponibilité chauffeur en ligne/hors ligne, sans interrompre la course active.
- Étapes partagées : chauffeur arrivé, client à bord, course terminée.
- Confirmation explicite des espèces reçues à la fin, commission et bilan actualisés sans doublon.
- Déclaration chauffeur identifiable dans le registre web et mobile.

## 1.6 — 15 novembre 2026

- Espace chauffeur dédié aux demandes clients : nom, photo facultative, prix, passagers, lieux et carte avant acceptation.
- Photo réservée aux chauffeurs validés et compatibles ; téléphone communiqué après acceptation.
- Demandes masquées pendant une course en cours ; bascule mobile vers la course acceptée.
- Dossier chauffeur conservé séparément. 68 tests automatisés réussis.

## 1.5 — 15 novembre 2026

- 7 % En Route et 93 % chauffeurs visibles avec leurs montants dès la vue d’ensemble.
- Commissions cumulées : dès 19 000 FC dus, seules les courses clients électroniques confirmées sont autorisées ; le compte chauffeur reste actif.
- Retour des espèces après régularisation intégrale, sans remise à zéro quotidienne de la dette.
- Bilans journaliers enregistrés à chaque écriture, archives, corrections datées et export CSV web/mobile.
- Choix du paiement client visible sur web/mobile ; moyens électroniques désactivés jusqu’à intégration du compte marchand.
- Contrôle serveur du mode de paiement et refus des fausses confirmations client. 64 tests automatisés réussis.

## 1.4 — 15 novembre 2026

- Tableau des encaissements sur web et mobile : espèces et électronique, caisse entreprise et espèces chauffeurs.
- Commission fixée à 7 %, part chauffeur calculée sur les encaissements réels confirmés.
- Registre des remises et des versements réservé à l’administrateur principal.
- Paiements partiels, soldes par FC/USD, contrôle des surpaiements et des doubles envois, annulations tracées et export CSV web.
- Les transferts marchands automatiques restent désactivés jusqu’à intégration du prestataire.
- Point client jaune, icône voiture pour le chauffeur et arrivée en vert sur les deux cartes.
- 56 tests automatisés ; parcours navigateur de caisse testé avec données fictives.

## 1.3.3 — 15 novembre 2026

- Acceptation confirmée par lecture si la réponse réseau est perdue ; aucun second POST automatique.
- Mise à jour immédiate de la course acceptée et messages réseau explicites.
- Fiche chauffeur avec véhicule, plaque et appel pour le passager, y compris invité.
- Partage GPS demandé à l’acceptation, permission conservée et arrêt à la mise en arrière-plan.
- Envoi GPS toutes les 3 secondes au maximum, lecture séquentielle toutes les 2 secondes après réponse.
- Repère du chauffeur actualisé sur les deux cartes ; cadrage incluant le chauffeur.
- 50 tests réussis ; parcours navigateur sans compte vérifié sur des positions synthétiques.

## 1.3.2 — 15 novembre 2026

- Correction de la validation chauffeur refusée lorsque le motif était vide.
- Conservation des vérifications de pièces, des droits et de la révision documentaire.
- Confirmation explicite et défilement vers les erreurs ou résultats de gestion.
- Test navigateur avec un dossier fictif et tests API sans motif réussis.

## 1.3.1 — 15 novembre 2026

- Espace chauffeur dédié accessible directement par /#chauffeur.
- Dépôt du dossier isolé des commandes et de la connexion client.
- Connexion chauffeur identifiée, avec les identifiants choisis au dépôt.
- Test du formulaire : dépôt, création de compte et transmission du statut sans ouverture de connexion.

# Évolutions

## 2026-11-09
- Suppression de « Une place libre, une nouvelle rencontre ».
- Demandes de course, acceptation par chauffeur validé, annulation, fin et notation.
- Option réservée aux passagères et conductrices.
- Calcul automatique du montant par distance estimée et catégorie.
- Dossiers chauffeurs et validation des documents par un administrateur.
- Déploiement Docker, données persistantes et configuration HTTPS.

## Amélioration de présentation
- Formulaire de course regroupé dans une carte, champs lisibles et boutons adaptés au mobile.
- Mise en évidence de Spécial femme et du montant estimé.
- Fiches chauffeurs et espacement du tableau de bord harmonisés.

## Parcours course et récupération
- Récupération propriétaire à clé temporaire et usage unique.
- Estimation sans compte, contrôle du prix à la confirmation et heure de Kinshasa.
- Les chauffeurs ne voient plus les demandes dont le départ est passé.
- Les plaques et pièces des chauffeurs ne sont pas publiques.
- Tests du parcours complet client, conducteur et administrateur.

## Commande immédiate
- Calcul automatique du prix et bouton Commander maintenant sur le site et le mobile.
- Les demandes immédiates restent visibles aux chauffeurs jusqu’à acceptation ou annulation.
- Protection contre les demandes immédiates en double et suivi mobile actualisé automatiquement.
