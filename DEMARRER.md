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
La construction du site et les tests des comptes et des courses sont exécutés avant création du ZIP. Le code mobile a été exporté pour Android et iOS lors de sa préparation. La version mobile actuelle a été exportée en JavaScript pour Android et iOS, sans compilation native signée. Les tests sur téléphones réels et la validation des boutiques restent à effectuer.
Les paiements réels nécessitent un compte marchand. Les distances sont des estimations entre centres des communes. Le serveur hébergé utilise un stockage privé pour les photos et documents. Sur votre propre Worker, provisionner les liaisons D1 DB et R2 BUCKET. Le serveur Node conserve ces données dans son volume privé : restreindre les accès et prévoir les sauvegardes. Les réglages d’hébergement, signatures, clés et données utilisateurs restent propres à votre installation.

## Commande client et administration
La commande immédiate fonctionne sans compte : nom et téléphone obligatoires, photo facultative, communes, repères précis et passagers. L’historique invité reste accessible avec la session du même navigateur ou téléphone. Créer un compte client ou s’y connecter depuis cette session transfère les courses. La déconnexion ou suppression de l’application fait perdre l’accès à une session invitée non associée. L’accès administrateur est distinct et ne sert pas à commander.

## Essai conseillé
1. Commander sans compte avec un nom et un numéro de test.
2. Vérifier les lieux, passagers et montant dans Mes trajets.
3. Annuler, puis recommander avec une photo facultative.
4. Créer un compte client depuis la même session : retrouver la course.
5. Vérifier séparément la connexion administrateur et la validation d’un chauffeur de test.
6. Avec ce chauffeur, accepter, terminer, puis noter le véhicule depuis le compte passager.

Aucun SMS de validation, service cartographique routier ni paiement marchand n’est connecté. La photo ne constitue pas une vérification d’identité. La mise en exploitation commerciale demande aussi les essais réels, les documents de confidentialité adaptés et la validation des dossiers chauffeurs.
