# Caisse En Route — version 1.4

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
