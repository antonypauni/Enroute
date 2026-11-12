# En Route sur Android et iPhone

Cette version native sert à tester l’estimation de prix, les demandes de course et le suivi des trajets avec un compte En Route existant. Les chauffeurs validés peuvent accepter et terminer leurs courses. Aucun encaissement n’est activé.

## Tester sur un téléphone

Installer une version d’Expo Go compatible avec Expo SDK 58. Dans le dossier `mobile`, lancer ces commandes. Ngrok est installé comme dépendance locale du projet.

```sh
npm.cmd ci
npm.cmd run start:tunnel
```

Garder le terminal ouvert et scanner son QR code. Si le port est occupé, accepter le port libre proposé. Le tunnel permet de tester depuis un autre réseau. Choisir un départ et une destination, vérifier l’estimation, saisir un nom et un téléphone de test, puis commander sans compte et annuler une demande. Pour vérifier l’acceptation et la note, utiliser aussi un compte de chauffeur déjà validé sur le site.

Si la connexion Expo échoue à ouvrir le navigateur, lancer `npm.cmd run login:terminal` et saisir les identifiants directement dans le terminal, puis relancer `npm.cmd run start:tunnel`. Un mot de passe ne doit jamais être placé dans une commande ou un fichier du projet.

Si Expo Go affiche une incompatibilité de version, consulter https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/. Sur iPhone, une version signée compatible peut être nécessaire selon la version disponible dans l’App Store.

Les serveurs Node.js et hébergé proposent `/api/mobile/login`. Pour utiliser votre propre serveur HTTPS, copier `.env.example` vers `.env`, renseigner `EXPO_PUBLIC_API_URL`, puis reconstruire l’application. Le serveur de test En Route est utilisé par défaut.

## Préparer les boutiques

Les profils EAS prévoient un APK interne pour Android et des builds de production pour Android et iOS. Après création et association du projet Expo à votre compte, configurer les signatures avec les comptes développeur Google et Apple. Les identifiants Android et iOS proposés sont `cd.enroute.mobile`. Les confirmer avant la première création des fiches sur les boutiques.

```sh
npx eas-cli build:configure
npx eas-cli build --platform all --profile production
```

Vérifier les builds signés sur des appareils réels, préparer les captures et les informations de confidentialité correspondant au service final, puis fournir un compte de test aux équipes de revue. Vérifier le parcours de gestion et de suppression des comptes avant soumission. Les fichiers signés et les fiches des boutiques restent à créer. Consulter les [instructions de soumission Expo](https://docs.expo.dev/deploy/submit-to-app-stores/).

Si le QR code local est inaccessible, tester le mode tunnel avec `npx expo start --tunnel ngrok`. Selon la version d’Expo Go, une connexion au même compte Expo sur l’ordinateur et le téléphone peut être nécessaire.

La photo est facultative. La connexion client et la création de compte sont facultatives et transfèrent les courses de la session invitée courante. L’administration dispose d’un accès distinct. Une session invitée est liée à cet appareil : associez-la à un compte avant de vous déconnecter pour conserver son historique.
