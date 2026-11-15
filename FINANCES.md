# Caisse En Route — version 1.5

Dans Administration → Encaissements, choisissez FC ou USD. Les devises ne sont jamais additionnées.

## Encaisser et reverser

1. La course doit être terminée, avec un chauffeur affecté et un montant valide.
2. L’admin principal enregistre uniquement un règlement réellement constaté. Une course terminée n’est pas automatiquement encaissée.
3. Pour les espèces, indiquez si le chauffeur ou la caisse En Route les a reçues. Pour l’électronique, le paiement doit être reçu sur le compte En Route et posséder une référence vérifiée.
4. Une remise du chauffeur transfère ses espèces vers En Route. Elle ne constitue pas une nouvelle recette.
5. Un versement au chauffeur enregistre un paiement effectué. Le montant ne peut dépasser son solde dû ni le solde disponible dans le mode de règlement sélectionné.

## Commission et soldes

En Route retient 7 % des sommes confirmées sur chaque course, avec arrondi dans l’unité de la devise. La part chauffeur est de 93 %. Les paiements partiels sont cumulés avant calcul pour éviter les écarts d’arrondi.

Exemple : 10 000 FC encaissés donnent 700 FC à En Route et 9 300 FC au chauffeur. Si le chauffeur garde les 10 000 FC en espèces, il doit remettre 700 FC à En Route. S’il remet toute la recette, En Route peut ensuite lui verser 9 300 FC.

Le solde chauffeur = part acquise sur encaissements − espèces client reçues par le chauffeur + remises à En Route − versements reçus. Un solde négatif représente une somme à reverser à En Route.

Les soldes couvrent toutes les écritures confirmées. Le filtre de période concerne les recettes et l’historique. Les montants représentent des mouvements enregistrés, pas un bénéfice comptable après taxes, frais marchand ou dépenses.

## Corrections et contrôles

Les écritures restent dans le registre. Pour corriger, indiquez un commentaire puis annulez l’écriture. Corrigez d’abord les versements dépendants si l’annulation créerait un solde insuffisant. Les références électroniques actives sont uniques et les renvois d’une même opération n’ajoutent pas de doublon.

Les administrateurs secondaires peuvent consulter. Seul l’administrateur principal peut enregistrer ou annuler un règlement. L’export CSV est disponible sur le site.

## Compte marchand

Le registre ne débite ni ne transfère d’argent. Les transferts automatiques sont désactivés. Lorsque le prestataire marchand sera choisi, il faudra intégrer ses API d’encaissement et de versement, vérifier ses confirmations et tester la connexion avant activation. Ne placez aucune clé secrète dans le code mobile ou dans GitHub.

Les essais de cette version utilisent des opérations fictives locales. Aucun paiement réel n’a été effectué pendant les tests.

## Commissions cumulées et restriction des espèces

Les 7 % s’accumulent sur les encaissements confirmés, sans virement après chaque course. Dès 19 000 FC de commission due, le chauffeur reste actif mais ne peut plus accepter de nouvelles courses clients payées en espèces. Les courses électroniques confirmées restent autorisées, y compris par affectation administrative. Le compte n’est pas suspendu et les courses en cours peuvent être terminées.

Les espèces redeviennent accessibles après régularisation intégrale de la commission. Un paiement partiel ne rétablit pas immédiatement les espèces. Les encaissements électroniques reçus par En Route augmentent la part acquise au chauffeur et peuvent compenser sa dette avant tout versement. Le solde de chaque devise est distinct ; aucun taux de change automatique n’est appliqué.

Le seuil est modifiable par le principal dans Encaissements. Le seuil USD est facultatif et indépendant.

## Choix du paiement client

Le client, y compris invité, voit Espèces, M-Pesa, Airtel Money, Orange Money, AfriMoney et Carte. Les moyens électroniques restent désactivés tant que l’intégration du prestataire marchand n’est pas terminée. Le serveur refuse tout statut « payé » envoyé par un client. Pour les courses électroniques, l’acceptation nécessite une confirmation provenant du prestataire ou d’une vérification administrative côté serveur. Aucune saisie de référence par un client ne suffit à rendre une course payée.

## Bilans journaliers

Chaque opération sauvegarde le bilan de sa journée, selon Africa/Kinshasa. Une journée passée est conservée ; une annulation ultérieure constitue une correction dans le bilan du jour de correction. Les périodes sans opérations entre deux enregistrements sont complétées au prochain enregistrement. Le bouton « Enregistrer le bilan du jour » permet aussi de conserver explicitement une journée sans opération. Aucun traitement nocturne externe n’est requis pour enregistrer les écritures.

Les bilans comprennent les espèces, l’électronique, les remises, les versements, les commissions et les soldes. Ils sont exportables en CSV sur le site et dans l’application mobile. Les 7 % et 93 %, avec leurs montants, figurent également dans la vue d’ensemble.

## Espèces déclarées par le chauffeur
À la fin du trajet, le chauffeur indique explicitement si les espèces restant dues ont été reçues. Une réponse positive crée une écriture « Espèces déclarées par le chauffeur », attribuée à son compte, et actualise le bilan et les 7 % cumulés. Une réponse négative ne crée aucune recette. Le principal peut corriger une déclaration avec une annulation tracée. Une répétition de la confirmation ne crée pas de doublon. Cela ne constitue pas une vérification bancaire et ne déclenche aucun transfert.
