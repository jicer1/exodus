# Exodus

Une expérience artistique de Jacinto Costoso autour de la marche, du paysage et du déplacement, en mémoire de l’exode rural espagnol.

**Essayer l’œuvre : https://costoso.net/exodus/**

### Données lourdes

Le dépôt GitHub contient le code, l’interface, les scripts et la documentation.
Les tuiles détaillées sont conservées sur le serveur externe et sont accessibles
depuis la version publiée sur [costoso.net/exodus](https://costoso.net/exodus/).
Elles sont volontairement exclues du dépôt GitHub pour garder un téléchargement
raisonnable.

Huertahernando constitue le territoire de départ et le repère du projet. La vue « Sur Terre » permet de rechercher un lieu par son nom ou ses coordonnées GPS, puis de choisir une zone. Son relief et ses images sont chargés pour créer un espace local où un marcheur autonome calcule des trajets entre les points sélectionnés, en tenant compte des pentes.

## Utilisation

Le programme est conçu pour un ordinateur Mac ou PC, avec un navigateur prenant en charge WebGL. Il n’est pas adapté aux téléphones.

L’interface propose le français, l’espagnol, l’anglais et le catalan. Les outils de test, dont le choix de langue, sont accessibles avec la commande `on test`. La commande `off test` les masque.

## Lancement local

Avec Python 3 installé, ouvrir un terminal dans le dossier du projet et lancer :

```sh
python serve.py --port 8766 --open
```

Sur macOS, utiliser `python3` si nécessaire. La page est disponible à l’adresse http://127.0.0.1:8766/index.html. Arrêter le serveur avec Ctrl+C. Les ressources présentes dans `assets/` sont nécessaires ; ouvrir directement le fichier HTML ne suffit pas.

Les images du globe, le relief du lieu choisi et la recherche par nom utilisent des services externes. Leur disponibilité et leur précision varient selon les sources et les régions.

## Organisation

- `index.html` : Huertahernando et la vue Terre.
- `zone.html` : espace local du lieu choisi.
- `app/` : interface, navigation, données et affichage.
- `Marcheur_autonome/` : calcul des trajets.
- `assets/` : terrain, images et attributions.
- `vendor/` : moteur Babylon.js et sa licence.
- `preparer_mise_a_jour.py` : préparation d’une copie pour le transfert manuel vers le serveur.

## Retours

Le projet est en cours de création. Les impressions artistiques, les propositions d’amélioration et les signalements de problèmes sont bienvenus. Pour un problème, préciser le navigateur, le lieu choisi, les étapes effectuées et, si possible, joindre une capture.

## Crédits et droits

Création et conception : Jacinto Costoso — https://www.costoso.net

Consulter `CREDITS.txt`, les fichiers d’attribution dans `assets/` et `vendor/LICENSE.babylon.md` pour les composants et données tiers. Leurs licences ne définissent pas les droits sur l’ensemble de l’œuvre. Aucune licence globale supplémentaire n’est accordée par ce document.
