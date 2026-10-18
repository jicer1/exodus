# EXODUS 2.0.1 — développement LOD, 18 octobre 2026

## État actuel

**Rotation près du sol :** le détail proche est conservé dans toutes les
directions. La référence complète les zones manquantes tuile par tuile ; tourner
le regard ne provoque plus une bascule générale. Les petits écarts verticaux
d'un glissement horizontal ne sont plus interprétés comme un recul LOD.
Un petit recul près du sol conserve aussi les maillages prêts, sans construction.
Le maintien commence sous 250 m de hauteur locale et se poursuit jusqu'à 350 m.

**Zoom arrière corrigé :** l'application réutilise le véritable maillage de la
1.0.15 et ne reconstruit plus de tuile pendant le recul. Les détails sont préparés
à l'approche seulement. Voir **[ZOOM_ARRIERE.md](ZOOM_ARRIERE.md)**, qui remplace
les descriptions de gestion du recul et du démarrage dans les rapports précédents.

Le terrain a depuis été étendu au territoire et intégré à une entrée séparée de
l'application : **../index-lod.html**. Les calculs tournent dans un worker local,
les transitions sont progressives, le contour valide est conservé et les images
HD existantes sont réutilisées. L'entrée ../index.html reste la 1.0.15 intacte.
Lire **[IMPLEMENTATION.md](IMPLEMENTATION.md)** pour la livraison actuelle,
ses vérifications et ses limites. Les sections suivantes conservent le rapport
du premier prototype ; ses pauses de 197 ms et ses travaux restant à faire
décrivent l'état initial, et non l'implémentation actuelle.

## État de livraison

Étapes 1 et 2 réalisées, étape 3 évaluée. **La généralisation n'est pas validée.**
L'application principale reste en 1.0.15. Aucun fichier existant de l'application,
du Marcheur ou de la publication n'a été modifié. Ne pas présenter ce prototype
comme une version complète et stable d'EXODUS 2.0.1.

Ouvrir `http://127.0.0.1:8771/terrain-lod/` avec le serveur de cet essai,
ou `/terrain-lod/` sur le serveur local habituel. Le navigateur doit prendre en
charge WebGL et DecompressionStream. Le serveur ne doit pas ajouter de
Content-Encoding aux fichiers `.gz`, qui sont décompressés par l'application.
Le prototype ne doit pas être ouvert avec le protocole file.

## Sécurisation réelle de la 1.0.15

Checkpoint : `../../Sauvegarde/exodus-1.0.15-before-lod/` depuis ce dossier.
L'archive `working-copy.zip` fait 260 186 octets. Elle contient les fichiers de
code/configuration de l'état de travail, y compris les changements non enregistrés.
Le manifeste comprend les empreintes SHA256 des fichiers archivés et de toutes
les ressources partagées (1 751 964 102 octets, vendor compris). Les ressources
originales restent physiquement en place et n'ont pas été copiées.

Point Git : tag annoté `exodus-1.0.15-before-lod-20261018`, référence au commit
`4033029`. **Le tag seul n'est pas l'état exact 1.0.15**, car le dossier contenait
des modifications non enregistrées et des fichiers non suivis. L'archive et
son manifeste sont indispensables. Le diff Git et l'état initial sont également
dans le checkpoint. Aucun commit utilisateur n'a été créé ou remplacé.

Les exclusions Git initiales protègent uniquement hd_tiles et marcheur_tiles
contre l'ajout accidentel. D'autres images lourdes ne sont pas exclues : ne pas
utiliser un ajout Git global. Le manifeste est un contrôle d'intégrité, pas une
seconde sauvegarde des données. Les binaires originaux, notamment
assets/huerta_webgl.bin et .json, demeurent nécessaires.

Retour immédiat : ouvrir `../index.html` ; le prototype n'est intégré nulle part.
Aucune restauration n'est nécessaire pour retrouver la 1.0.15.
Si des travaux ultérieurs modifient les fichiers existants, conserver d'abord
ces nouveaux travaux, extraire working-copy.zip dans un dossier temporaire,
contrôler ses empreintes puis rétablir les fichiers archivés dans le dossier
de développement. Conserver les ressources partagées originales ; ne pas
utiliser un reset Git pour reconstituer les modifications non enregistrées.

Validation effectuée : extraction complète dans un dossier temporaire,
comparaison SHA256 de chaque fichier extrait, puis comparaison de tous les
fichiers originaux et ressources en place. `python terrain-lod/check_restore.py`
rejoue ce contrôle sans écraser l'application. Le dossier temporaire est nettoyé
automatiquement. Cette vérification n'est pas un test fonctionnel exhaustif de
l'application restaurée sur une autre machine.

## Architecture du prototype

Quatre tuiles de 512 m : lignes MNT 7–8, colonnes 8–9, soit 1 024 × 1 024 m,
avec ravins et terrasses. Les altitudes sont lues directement dans les tuiles
gzip existantes de assets/marcheur_tiles, en lecture seule, sans charger le
calcul du Marcheur. Le manifeste compte 342 tuiles MNT ; ce découpage n'est pas
celui des 360 tuiles d'images HD, dont l'origine et le sens des lignes diffèrent.

Les sommets utilisent les centres des pixels natifs, à 2 m. Translation locale :
UTM X moins 559 563 ; UTM Y moins 4 519 538 ; Z est l'altitude absolue du MNT.
Aucune exagération verticale ni interpolation des altitudes n'est appliquée.
Pas de déplacement d'objet, modification de coordonnées ou modification du MNT.

LOD : pas 2, 4, 8, 16, 32 m. Seuils exploratoires : distances 3D au centre des
tuiles de 550, 1 000, 1 800 et 3 200 m, avec hystérésis de 15 %. Ils ne sont pas
calibrés pour une livraison finale et ne commandent aucun calcul de parcours.
L'altitude 1 080 m utilisée pour estimer les distances concerne seulement cette zone.

Chaque bord conserve tous les sommets natifs à 2 m, même dans les niveaux
grossiers. Les cellules de bord grossières sont triangulées autour de leur
centre natif. Les deux tuiles voisines ont donc les mêmes segments et altitudes,
sans jupes ni trous topologiques. Les normales restent calculées par tuile :
une validation complémentaire de leurs raccords lumineux reste nécessaire.

Une seule représentation par tuile subsiste après chaque remplacement ;
l'ancienne est libérée après construction de la nouvelle. Une petite superposition
transitoire des deux buffers est nécessaire au remplacement atomique. Aucun cache
de cinq géométries n'est conservé. Neuf tuiles MNT décodées au maximum sont utiles
à cette emprise, y compris les bordures partagées, soit 2,25 Mio d'altitudes.
Le changement vers l'ancien maillage libère les meshes LOD et le cache MNT.
Le retour vers le LOD libère le patch de comparaison.

La comparaison extrait le patch de terrain depuis les exports .json et .bin
originaux. Le binaire de 79,6 Mo est lu temporairement puis ses références sont
relâchées. Son chargement ne représente pas le chargement complet de la 1.0.15.
Les deux modes réutilisent une même image de base existante, sans régénération
ni copie de texture. Le prototype n'intègre pas encore le chargeur HD ni les
couches SIG ; son éclairage n'est pas un test de parité de l'apparence finale.

## Résultats observés dans le navigateur local

| Mode, même vue de la zone | Triangles | Géométrie LOD estimée | Débit observé |
| --- | ---: | ---: | ---: |
| Patch extrait de la 1.0.15 | 16 918 | non comptabilisée dans la colonne LOD | environ 60 images/s |
| Quatre tuiles à 8 m | 37 856 | 1,07 Mio | environ 60 images/s |
| Quatre tuiles à 2 m | 524 288 | 14,06 Mio | environ 60 images/s |

Temps initial du prototype observé après réouverture : 413 à 448 ms, sensible au
cache. Construction/chargement maximal d'une tuile observé : 315 ms, réseau local
et décompression compris. Image la plus lente pendant le passage à 2 m : **197 ms**.
Ces valeurs sont exploratoires sur cette machine, sans preuve de fluidité sur
une machine modeste. Le débit stabilisé ne masque pas les pauses de construction.
La RAM totale du processus et la mémoire graphique ne sont pas mesurées ; les
buffers géométriques estimés ne représentent pas ces consommations totales.
Le bouton d'export fournit les mesures disponibles, avec valeurs null pour les
indicateurs indisponibles et l'historique des 200 dernières constructions.

Le test `node terrain-lod/test.cjs` vérifie avec les vraies données : altitude de
chaque sommet, aire exacte, orientation des triangles, absence de triangle
dégénéré, maillage manifold, bordures identiques dans les deux directions pour
les 25 couples LOD. Résultats dans geometry-results.json. Le test existant
`node tests/local_walker.cjs` passe également. Tous les fichiers d'origine du
Marcheur ont les mêmes empreintes qu'avant l'intervention. Son interface et
son intégration au LOD n'ont pas été testées puisque le prototype est séparé.

## Découpe de l'emprise et décision

**Vérification complémentaire après la remarque de l'utilisateur :** analyse du
masque à la résolution native et des composantes connexes (voisinage à quatre
directions). Sur les 7 130 734 échantillons invalides, **7 130 733 sont reliés à
l'extérieur du rectangle**. Un seul pixel invalide est isolé à l'intérieur.
La carte footprint.png confirme une découpe irrégulière de l'emprise. Les 34,34 %
ne doivent donc pas être présentés comme un manque généralisé du MNT : il s'agit
presque entièrement de l'extérieur de l'emprise utile. Le script
check_footprint.py et footprint-results.json rendent cette vérification reproductible.
Le traitement du contour et du pixel isolé reste nécessaire dans la géométrie.
Il ne nécessite pas à lui seul de retrouver un nouveau MNT source.

L'audit complet des tuiles natives (`python terrain-lod/audit_dem.py`) révèle
7 130 734 échantillons sans altitude exploitable sur 20 765 880, soit **34,34 %
du rectangle**. 174 tuiles sont affectées, dont 92 entièrement invalides. Cela
peut correspondre à l'extérieur de l'emprise réellement levée, pas forcément à
des trous dans la zone utile. Il faut établir le masque exact avant généralisation.
Aucun TIFF source n'a été trouvé dans les deux dossiers de projet autorisés.
Le prototype refuse les altitudes invalides au lieu de les remplacer arbitrairement.

La généralisation est suspendue, conformément à l'étape d'évaluation demandée :
les pauses atteignent 197 ms et les changements de relief sont encore francs.
La couverture du MNT n'est plus considérée comme un obstacle majeur après la
vérification du masque ci-dessus. Options de gestion de l'emprise :

1. Utiliser le masque des données valides existantes pour découper les géométries.
2. Couvrir uniquement les données valides avec le LOD, et conserver la géométrie
   originale ailleurs, en construisant un raccord explicite au masque (sans
   inventer d'altitudes ni garder deux terrains complets superposés).
3. Conserver la 1.0.15 pendant la poursuite du laboratoire, qui est l'état actuel.

Avant intégration : déplacer la construction vers un worker local et limiter
les uploads par image ; ajouter les transitions progressives et leur contrôle
d'erreur ; gérer un budget de meshes et un cache borné pour tout le territoire ;
mapper correctement les 360 images HD ; préserver et tester le terrain invisible
de navigation, les picks, objets, couches et parcours. Ne modifier aucun fichier
du calcul du Marcheur. Ces points ne sont pas validés par cet essai.

## Disque et fichiers

Espace libre initial : environ 28,1 Go. Ressources originales réutilisées en place :
environ 1,75 Go (images, exports, altitudes, vendor). Fichiers originaux modifiés :
**aucun**. Nouveaux fichiers : ce dossier, le checkpoint et le tag Git local.
secure.py produit le checkpoint une seule fois et refuse son écrasement ;
check_restore.py vérifie son extraction et les ressources ; audit_dem.py audite
la couverture ; geometry.js construit les meshes ; prototype.js pilote Babylon ;
index.html expose l'essai ; test.cjs vérifie la géométrie. Les JSON et PNG sont
les résultats et captures de validation. Aucun fichier géométrique n'est généré
sur disque ; aucune image ou tuile MNT n'a été dupliquée. Les seuls PNG nouveaux
sont de petites captures d'écran.

Si l'on persistait inutilement tous les niveaux pour 342 tuiles pleines, les seuls
attributs position/normal/UV/indices représenteraient environ 1,75 Go non compressés,
dont 1,26 Go pour le niveau 2 m. Ce prototype évite cette duplication : génération
à la demande depuis les altitudes existantes, pas de génération territoriale.
Une future architecture doit garder cette stratégie et imposer un budget RAM/GPU.
Aucun transfert extérieur ni mise en production n'a eu lieu.
