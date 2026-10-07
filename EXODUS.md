# Exodus — premier prototype

Copie de l'application web Huertahernando. Ouvrir index.html depuis un serveur local.
Le bouton « Sur Terre » affiche une sphère simple ; « Retour à Huerta » retrouve
la scène et la caméra locales. La navigation reprend les gestes de Huerta :
clic gauche maintenu pour déplacer la surface, bouton du milieu pour tourner et
incliner autour du point visé, clic droit pour tourner horizontalement et zoomer
verticalement. La molette zoome vers le point sous le pointeur. Un repère orange
montre le pivot pendant la rotation. La proximité rend les déplacements plus fins,
avec une approche jusqu'à 1 km. Ces réglages concernent uniquement la caméra Terre.

La sphère porte l'image NASA Blue Marble de juin 2004 (5400 × 2700), découpée
en 170 tuiles géographiques sur quatre niveaux. Une image générale de 1024 × 512
reste affichée sous les tuiles pendant leur chargement. La sélection suit la vue,
le zoom et l'horizon ; quatre images au maximum sont chargées simultanément.
Le cache garde au maximum 96 tuiles et libère les anciennes zones inutilisées.
Les chargements suivants sont suspendus au retour à Huerta.
La commande « on test » affiche la luminosité et le suivi des tuiles ; « off test »
les masque. Le réglage initial de luminosité est 210 %, conservé dans le navigateur.
Le découpage ne crée pas de détails supplémentaires dans l'image source.
Le script build_earth_tiles.py reproduit les tuiles avec deux pixels de bordure
pour le filtrage, une longitude cyclique et une origine au nord-ouest.
Elle n'a pas encore de relief ni de calcul de marche.
Les panneaux locaux sont désactivés sur Terre. Le repère sphérique utilise Z au nord,
X au méridien 0 et Y à 90° est. Les unités d'affichage sont distinctes des mètres.
Le rayon moyen de 6 371 008,8 m sert uniquement de base pour ce prototype sphérique.

Le module app/exodus_terre.js gère la scène globe séparée ; app/exodus_navigation.js
gère ses commandes et les intersections avec la sphère. app/exodus_tiles.js gère
la sélection, le chargement et le cache des images. Le rendu et les boucles
de Huerta sont suspendus lorsque Terre est affichée ; ils reprennent au retour.
Cette séparation permet d'adapter progressivement la géométrie et la navigation.
