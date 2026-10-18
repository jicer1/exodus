# Zoom arrière : réutiliser le terrain de la 1.0.15

## Fonctionnement actuel

L'entrée `/index-lod.html` conserve le vrai maillage visible `terrain` de la
1.0.15 : 654481 sommets, 1305728 triangles, mêmes coordonnées, UV et matériau.
Il est prêt dès le chargement de la scène. Le démarrage ne fabrique plus de
version LOD grossière pour le territoire entier et ne lit aucune tuile MNT native.

La molette arrière, le recul au bouton droit et PageDown suspendent les nouvelles
constructions. Près du sol, ils conservent maintenant le détail **déjà prêt**.
Au-dessus de 250 m de hauteur locale, un nouveau recul revient au maillage de
référence. Un maintien commencé plus bas continue jusqu'à 350 m, afin qu'un
petit recul dans un ravin ne fasse pas immédiatement disparaître le détail.
Ces seuils de développement pourront être ajustés après essai utilisateur.
La caméra continue de suivre les commandes d'origine.
Aucune nouvelle construction de tuile n'est envoyée au worker pendant le recul.
Un travail déjà en cours peut terminer, mais son résultat est ignoré ; son
éventuelle publication ou transition ne fait pas attendre le retour au terrain
de référence. Le retour à la vue initiale suit la même règle.

La référence complète toujours les secteurs non préparés. Conserver le détail
proche n'en fabrique pas davantage pendant le recul : la vue garde ses maillages
existants. Le retour à la vue initiale et les reculs plus hauts retrouvent la
1.0.15 immédiatement. Une approche suivante peut compléter les détails.

Les nouvelles géométries sont préparées uniquement dans les vues proches :
distance au pivot inférieure à 2600 m, ou hauteur au-dessus du terrain sous la
caméra inférieure à environ 867 m. Cette seconde condition évite de confondre une vue
horizontale proche du sol avec une vue générale lorsque le pivot est éloigné.
Cette hauteur est mesurée par un rayon vertical sur le maillage de navigation
existant, sans le modifier. Le point de sol est réutilisé tant que la caméra
ne se déplace pas de plus de 8 m horizontalement. Il s'agit donc d'une estimation
selon ce maillage, pas d'un nouveau chargement des altitudes natives de 2 m.
Une absence de terrain sous la caméra ne déclenche pas de maintien proche.

## Rotation près du sol, dans un ravin

La préparation et la conservation du détail dépendent maintenant de la position
de la caméra, sans dépendre de son orientation. Un voisinage à 1500 m des limites
des tuiles est préparé dans toutes les directions, avec un maximum de 48 tuiles
(24 en profil économe), sous le budget de mémoire existant. Regarder ailleurs
ne supprime plus une tuile après 1,8 seconde. Quitter ce voisinage la libère.

La référence reste affichée dans les secteurs éloignés ou encore en préparation.
Le shader masque seulement son emprise sous les tuiles détaillées présentes,
avec un fondu tramé complémentaire de 180 ms par nouvelle tuile. Une nouvelle
direction du regard ne provoque donc plus de retour général vers la référence.
Le raffinement d'une tuile conserve le morphing de 450 ms. Une petite jupe
verticale de rendu de 64 m ferme la jonction avec le maillage de référence ;
elle suit les segments natifs valides de 2 m et ne traverse pas les NoData.
Les altitudes et triangles de surface, le MNT et la navigation restent inchangés.

Un glissement droit majoritairement horizontal tolère les petits écarts verticaux
de la main : le détecteur LOD reconnaît un recul vertical à partir de 6 pixels
et lorsque ce déplacement dépasse 35 % du déplacement horizontal. Les commandes
d'origine restent exécutées intégralement. La détection par déplacement de caméra
vérifie aussi son alignement avec la direction du recul, afin de ne pas confondre
une rotation orbitale ou un déplacement latéral avec un recul.

La géométrie fine existante peut être réutilisée sans être simplifiée de nouveau.

Les changements de pivot (aller à un repère) sont distingués d'un recul autour
du même pivot. Les déplacements de survol sont laissés au module d'origine.

## Mémoire et ressources

Un seul maillage d'ensemble est conservé : celui de la 1.0.15. Il n'existe plus
de deuxième représentation LOD complète générée au démarrage. Les surfaces HD
redondantes restent libérées ; les images sont partagées avec les objets d'origine.
Le shader applique aussi ces images au maillage de référence, jusqu'à neuf images
selon les capacités graphiques (repli sur l'image de base pour les autres).

La référence compte environ 34,92 Mio d'attributs et d'indices. Le budget de
géométrie inclut maintenant cette référence **et** les détails : 80 Mio en profil
standard, 48 Mio en profil économe. Ce budget ne représente pas la RAM/GPU totale :
les images, le moteur, le terrain de navigation et les buffers transitoires sont
en supplément. Le cache MNT reste limité à 32 tuiles, au plus 8 Mio.

Après environ trois secondes dans la vue de référence, les géométries locales
inutilisées et le cache MNT sont libérés. Cette libération ne construit aucun
terrain. Un recul qui conserve le détail proche ne déclenche pas cette libération.
Une nouvelle approche peut donc préparer de nouveau les détails.

Les positions, UV et indices de la référence et de la navigation sont détachés
du gros tampon binaire en copiant les mêmes valeurs, sans changement géographique.
Les données originales restent sur disque, inchangées. Aucun fichier d'image
ou de terrain n'est dupliqué pour cette évolution.

## Vérifications

**Dernier essai du maintien près du sol :** 59 contrôles réussis dans les deux
profils, standard et économe (`integration-results.json` et
`integration-economy-results.json`).
Le recul horizontal proche conserve les mêmes maillages et le même compteur,
la rotation qui le suit ne relance pas de construction, et quatre allers-retours
de zoom ne provoquent pas de bascule SD. Lors de la montée verticale graduelle,
la vue reste détaillée de 85 à 332 m de hauteur locale, puis passe à la référence
à 353 m : 84 constructions avant et après, zéro nouvelle pendant le recul.
Les gestes réels dans le secteur du ravin restent à 32 constructions après
zoom arrière, rotation droite, zoom avant et rotation gauche ; voir
`ravine-zoom-results.json`. Le point de reproduction est voisin du point GPS
affiché par le HUD, sans prétendre restituer exactement la caméra utilisateur.
L'entrée `index-lod.html?ravinePreview=1` permet de retrouver ce cas local.

Les contrôles d'intégration vérifient la présence du vrai maillage de référence,
le démarrage sans construction LOD, le détail proche, les coordonnées et parcours
inchangés, le retour immédiat et un compteur de constructions strictement stable
après le recul. La molette arrière est testée à travers les écouteurs de navigation
existants, ainsi que la libération différée des détails et du cache MNT. Ils
comprennent aussi un panorama horizontal à 360° à 25 m du terrain, le maintien
des mêmes géométries sans nouvelle construction, les petits écarts verticaux de
la souris et un pivot éloigné. `test-skirts.cjs` vérifie la conservation exacte
de la surface et des buffers de transition, et l'absence de pont sur les NoData.
Résultats actuels dans `integration-results.json`.

Le relevé historique avant la correction de rotation comptait 46 contrôles
réussis, avec 21 constructions avant et après le recul et zéro demande pendant
le recul. Après libération : zéro tuile détaillée résidente, zéro tuile MNT en
cache et 36612128 octets pour le maillage de référence. Les résultats actualisés
de la rotation et du recul sont conservés dans `integration-results.json`.
Les 54 contrôles actualisés passent dans les deux profils : rapport standard
`integration-results.json` et rapport économe `integration-economy-results.json`.
Le panorama conserve les mêmes maillages et le même compteur (44 → 44 en
standard, 30 → 30 en économe). Le petit écart vertical de 1 pixel n'augmente
pas le compteur de bascules de recul. Dans l'essai standard, le vrai recul
vertical reste à 98 constructions avant/après ; la molette et le retour initial
restent à 105 avant/après, avec zéro demande pendant le recul. La mémoire de
géométrie du voisinage à 25 m du sol est d'environ 57,4 Mio en standard et
41,9 Mio en économe, référence incluse. Les contrôles de restauration et du
Marcheur local passent également, avec les fichiers originaux inchangés.
Le démarrage de l'organisation avec référence conservée a été observé
à environ 2,48 s, sans construction territoriale initiale ; ce relevé local est
conservé dans `benchmark-base-overview.json` et n'est pas une garantie tous matériels.

Le laboratoire `/terrain-lod/` reste un outil de comparaison des géométries LOD :
sa logique expérimentale de simplification est distincte du comportement de
l'application `/index-lod.html` décrit ici.

Le Marcheur, ses paramètres et ses fichiers restent inchangés. L'entrée
`/index.html` conserve intégralement la 1.0.15. Aucune publication n'est effectuée.
