# En Route sur Android et iPhone

Cette version native sert à tester l’estimation de prix, les demandes de course et le suivi des trajets avec un compte En Route existant. Les chauffeurs validés peuvent accepter et terminer leurs courses. Aucun encaissement n’est activé.

## Tester sur un téléphone

Installer Expo Go sur les deux téléphones. Relier le téléphone et l’ordinateur au même réseau Wi-Fi. Dans le dossier `mobile` du dépôt, lancer :

```sh
npm ci
npm start -- --lan
```

Scanner le QR code depuis Expo Go sur Android ou l’appareil photo sur iPhone. Choisir un départ et une destination, vérifier l’estimation, se connecter avec un compte En Route de test, puis envoyer et annuler une demande. Pour vérifier l’acceptation et la note, utiliser aussi un compte de chauffeur déjà validé sur le site.

Les serveurs Node.js et hébergé proposent `/api/mobile/login`. Pour utiliser votre propre serveur HTTPS, copier `.env.example` vers `.env`, renseigner `EXPO_PUBLIC_API_URL`, puis reconstruire l’application. Le serveur de test En Route est utilisé par défaut.

## Préparer les boutiques

Les profils EAS prévoient un APK interne pour Android et des builds de production pour Android et iOS. Après création et association du projet Expo à votre compte, configurer les signatures avec les comptes développeur Google et Apple. Les identifiants Android et iOS proposés sont `cd.enroute.mobile`. Les confirmer avant la première création des fiches sur les boutiques.

```sh
npx eas-cli build:configure
npx eas-cli build --platform all --profile production
```

Vérifier les builds signés sur des appareils réels, préparer les captures et les informations de confidentialité correspondant au service final, puis fournir un compte de test aux équipes de revue. Vérifier le parcours de gestion et de suppression des comptes avant soumission. Les fichiers signés et les fiches des boutiques restent à créer. Consulter les [instructions de soumission Expo](https://docs.expo.dev/deploy/submit-to-app-stores/).

Si le QR code local est inaccessible, tester le mode tunnel avec `npx expo start --tunnel ngrok`. Selon la version d’Expo Go, une connexion au même compte Expo sur l’ordinateur et le téléphone peut être nécessaire.
