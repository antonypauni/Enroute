# En Route RDC

Application React et Node.js : covoiturage et demandes de course à Kinshasa.

## Installation locale
Node.js 22 ou plus. Exécuter `npm ci`, `npm run build`, puis `npm start`.
Ouvrir http://127.0.0.1:3001. Les dépendances sont nécessaires pour construire et tester, pas pour lancer le serveur déjà construit.

## Déploiement Docker
1. Copier `.env.example` vers `.env` et renseigner PUBLIC_ORIGIN (URL HTTPS exacte sans barre finale) et ADMIN_EMAIL.
2. Exécuter `docker compose up -d --build`.
3. Configurer votre reverse proxy HTTPS vers 127.0.0.1:3001.
4. Créer le premier compte avec l’adresse ADMIN_EMAIL : il devient administrateur.
Le cookie de production exige HTTPS. Le volume enroute_data conserve les données. Sauvegarder ce volume hors du serveur. Une seule instance est prise en charge par le stockage JSON.

## Fonctionnement
La page « Commander une course » calcule le tarif puis crée une demande. Un chauffeur connecté, dont le dossier est approuvé par l’administrateur, accepte les demandes correspondant à sa catégorie. Le client suit la course ; le chauffeur la termine ; le client peut noter le véhicule une fois. Les statuts sont rafraîchis toutes les sept secondes.
« Spécial femme » exige une passagère et une conductrice. L’identité déclarée doit être vérifiée manuellement dans le dossier ; aucun contrôle d’identité automatique n’est revendiqué.
Les trois chauffeurs de présentation et leurs notes sont fictifs. Ils ne prennent pas de vraies courses et ne disposent pas de comptes de connexion par défaut.

Les chauffeurs déposent quatre documents (PDF, PNG ou JPEG, 1 Mo chacun) : identité, permis, carte grise et assurance. L’administrateur les consulte avant validation. Dans cette démonstration, utiliser uniquement des documents fictifs. Les fichiers sont stockés dans le volume de données, jamais dans GitHub.

## Tarifs
Montant CDF = (1 500 + distance estimée en km × 700) × coefficient de catégorie, arrondi à la centaine supérieure. Coefficients : Standard 1 ; Confort 1,4 ; XL 1,8. Distance : à vol d’oiseau entre centres des communes × 1,3. Durée indicative à 25 km/h. Ces tarifs sont des réglages de démonstration, pas un barème commercial validé. Modifier server/rides.js pour les adapter. Un service de routage est nécessaire pour un calcul routier précis.

## Vérification et limites
`npm test` et `npm run build`. La construction et les tests métier des nouvelles courses passent. Les tests HTTP locaux peuvent nécessiter l’autorisation réseau de l’environnement d’exécution. Docker et l’interface finale ne sont pas encore vérifiés sur l’hébergeur cible.

Le paiement Mobile Money/carte est présenté mais aucun compte marchand n’est connecté. Aucune demande n’est déclarée payée. Avant exploitation réelle : paiement et confirmation par webhook, itinéraires routiers, validation de l’identité, gestion des documents adaptée à la production, récupération des comptes, base transactionnelle et sauvegardes. Le ZIP est déployable comme démonstration, pas une certification de lancement commercial.

GitHub conserve le code et l’historique. GitHub Pages seul ne peut pas exécuter ce serveur Node.js. Utiliser un hébergement Docker ou Node.js avec stockage persistant.
