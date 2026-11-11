# En Route — projet complet

## Contenu
Le site React, le serveur Node.js, le serveur Cloudflare Worker, les migrations D1, le tableau de bord, la commande immédiate, l’option Spécial femme et l’application native Expo Android/iOS sont inclus avec leurs sources. Le dossier dist contient les versions compilées du site et du Worker. Le dossier mobile contient la configuration de compilation et les dépendances verrouillées.

## Démarrer le site déjà construit
Installer Node.js 22 ou plus puis lancer `npm start` dans ce dossier. Ouvrir http://127.0.0.1:3001. Les dépendances du site sont nécessaires uniquement pour reconstruire (`npm ci` puis `npm run build`). Configurer le premier compte administrateur avant de publier sur Internet.

## Déployer le serveur
Le Dockerfile et compose.yaml sont inclus. Copier .env.example vers .env, choisir votre URL HTTPS et votre adresse administrateur, puis lancer `docker compose up -d --build`. Configurer le reverse proxy HTTPS vers le port 3001 et sauvegarder le volume de données. Ce serveur JSON est prévu pour une instance. Le serveur déjà hébergé utilise D1.

## Tester et construire le mobile
Dans mobile, lancer `npm ci`, puis `npm start`. Voir mobile/README.md pour Expo Go. Modifier EXPO_PUBLIC_API_URL avec votre URL HTTPS avant de construire l’application pour votre serveur.
Les profils EAS préparent un APK Android de test, un AAB Android de production et une compilation iOS. Après association à votre compte Expo, lancer `npx eas-cli build --platform all --profile production`. La signature et l’envoi aux boutiques utilisent vos comptes développeur. Les APK/AAB/IPA signés restent à générer.

## Vérifications et état du service
La construction du site et les tests des comptes et des courses sont exécutés avant création du ZIP. Le code mobile a été exporté pour Android et iOS lors de sa préparation. La dernière modification mobile a été vérifiée pour la syntaxe. Les tests sur téléphones réels et la validation des boutiques restent à effectuer.
Les paiements réels nécessitent un compte marchand. Les distances sont des estimations entre centres des communes. Les documents chauffeurs doivent rester fictifs dans cette version jusqu’à la finalisation du stockage de production. Les réglages d’hébergement, signatures, clés et données utilisateurs restent propres à votre installation.
