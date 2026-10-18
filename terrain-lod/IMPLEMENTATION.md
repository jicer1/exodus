# EXODUS 2.0.1 — version de développement

18 octobre 2026. Aucune publication ou modification du serveur externe.

## Mise à jour : zoom arrière sans reconstruction

Le fonctionnement actuel est décrit dans **[ZOOM_ARRIERE.md](ZOOM_ARRIERE.md)**.
Il réutilise le maillage de la 1.0.15 comme vue d'ensemble et secours immédiat.
La rotation près du sol conserve désormais un voisinage de détails dans toutes
les directions ; la référence complète les secteurs restants, sans bascule
générale à chaque changement du regard. Les jonctions avec la référence utilisent
des jupes de rendu, sans changer la surface ni les altitudes MNT.
Le recul n'envoie plus de construction de tuile au worker. Les nouvelles tuiles
sont réservées aux vues proches ; il n'y a plus de génération LOD territoriale
au démarrage. Le budget inclut la référence conservée : 80 Mio, ou 48 Mio en
profil économe. Les sections suivantes documentent l'architecture précédente
et ses mesures historiques ; les valeurs de démarrage de 5,14 s et les 249
tuiles générées d'emblée ne décrivent plus le fonctionnement actuel.

## Accès et retour immédiat

- Application avec terrain LOD : `/index-lod.html`.
- Profil économe : `/index-lod.html?lodQuality=economy`.
- Laboratoire comparatif : `/terrain-lod/`, zone limitée ou territoire complet.
- Version 1.0.15 : `/index.html`, inchangée et toujours accessible.
- Contrôles intégrés : `/index-lod.html?verify=1`.
- Statistiques optionnelles : `/index-lod.html?lodStats=1`.

Utiliser le serveur local habituel, ou celui de la session sur 127.0.0.1:8771.
Les scripts, moteurs, images et altitudes viennent des fichiers locaux existants.
Le nouveau terrain ne dépend d'aucun service extérieur. WebGL, Web Workers et
DecompressionStream gzip doivent être disponibles. Le serveur doit servir les
.gz sans ajouter Content-Encoding (la décompression est effectuée dans le worker).

Il s'agit d'une version de développement fonctionnelle, pas d'une publication
en production. Une validation utilisateur sur les machines visées reste nécessaire.

## Architecture

`integration.js` adapte le chargeur depuis la seule nouvelle entrée. Tous les
modules existants restent partagés, notamment interface, navigation, SIG et
Marcheur. Après le chargement de la scène, il libère la géométrie du terrain
visible original et des 360 surfaces HD devenues redondantes. Les objets et leurs
matériaux restent présents pour le chargeur d'images et les références existantes.

Le terrain invisible original de navigation conserve exactement ses 65 536
sommets, indices, coordonnées et transformations. Ses tableaux sont détachés
du tampon d'export commun de 79,6 Mo en copiant les mêmes valeurs ; les bandes
et l'octree de picking sont reconstruits avec les mêmes paramètres (128, 16/4).
Cela évite de retenir toutes les géométries abandonnées par une petite vue typée.
Les picks et altitudes associés gardent
donc le comportement de la 1.0.15 ; ils ne deviennent pas des mesures sur le
maillage visible à 2 m. Aucun calcul ni paramètre du Marcheur n'est modifié.
Ses données, ses fichiers et ses résultats géographiques restent indépendants
du LOD. Le test d'intégration calcule un vrai parcours avec son worker d'origine.

Le worker LOD charge et décompresse les tuiles natives existantes, construit les
positions, normales, indices et UV, puis transfère leurs buffers au rendu.
Les constructions sont sérialisées ; leurs voisins sont lus avec au plus quatre
requêtes simultanées. Le cache LRU est limité à 32 tuiles décodées,
au plus 8 Mio d'altitudes. Aucun fichier géométrique n'est créé sur disque.

Les tuiles géométriques utilisent le découpage MNT de 512 m et les centres des
pixels à 2 m. Les coordonnées restent est/nord/altitude, avec les translations
locales UTM 559563 / 4519538. Les altitudes finales des sommets sont celles du
MNT, sans exagération verticale ni lissage. Les résolutions sont 2, 4, 8, 16 et 32 m.
Les seuils exploratoires de distance sont 550, 1000, 1800 et 3200 m, hystérésis 15 %.
Ils pourront être ajustés après essais sur les machines cibles.

Les bords communs gardent toujours les échantillons à 2 m. Les cellules grossières
de bord sont triangulées en éventail pour éviter les fissures et les T-junctions.
Les normales viennent de dérivées du MNT natif identiques de part et d'autre.
Les cellules traversées par le masque de validité utilisent des triangles natifs :
aucun triangle ne couvre artificiellement un pixel sans altitude. La découpe
extérieure et le pixel invalide isolé ne sont pas comblés avec des hauteurs inventées.

Les transitions de 450 ms sont réalisées sur le GPU. En raffinement, les nouveaux
sommets partent de la surface triangulée grossière et rejoignent leurs altitudes
natives. En simplification, le maillage fin rejoint la surface grossière avant
son remplacement. Les bords ne bougent pas. Une petite représentation provisoire
de la seule tuile en transition est nécessaire, puis libérée. La projection
conserve exactement les altitudes aux sommets ; une triangulation fine peut
approcher différemment l'intérieur des éventails grossiers durant une transition.

Le budget des attributs géométriques résidents est 80 Mio, 40 Mio en profil économe.
Au plus quatre tuiles à 2 m sont admises ; le profil économe garde au minimum 4 m.
Les surfaces hors du champ de caméra sont libérées après un délai de 1,8 s.
Les nouveaux besoins sont prioritaires près de la caméra. Une navigation de plus
de 64 m ou un changement d'orientation interrompt la file après la transition
courante pour réévaluer les besoins. La vue initiale est construite en grossier,
puis se raffine automatiquement. Aucun terrain complet à 2 m n'est chargé.

## Images HD et couches

Le découpage MNT, indexé depuis le nord, diffère du découpage des 360 images,
indexé depuis le sud et aligné sur les multiples de 512 m du repère local.
Chaque géométrie peut utiliser jusqu'à quatre images HD voisines. Le shader lit
directement les textures détenues par les objets d'origine ; aucune image n'est
copiée, régénérée ou assemblée dans un atlas. La bordure existante est respectée
avec UV `(coordonnée locale dans l'image + 16) / 544`, déduits des exports.

Le matériau de terrain est partagé. Les samplers et limites HD sont réassignés
à chaque tuile rendue, même lorsque Babylon conserve ce matériau entre deux
dessins. La correction gamma et l'éclairage existants restent appliqués.
Les changements d'image de base et le chargement/libération HD sont assurés par
les modules d'origine. Historique couleur, topographie, géologie et retour à
l'imagerie courante sont inclus dans la validation d'intégration.

## Vérifications et observations

- `test.cjs` : 25 couples de résolutions, coordonnées et altitudes natives,
  bords identiques, aire, triangles non dégénérés et topologie manifold.
- `test-morph.cjs` : projection sur les vrais triangles, aucun déplacement XY,
  bords fixes, retour aux altitudes natives après aller-retour.
- `test-mask.cjs` : les 342 tuiles, égalité exacte de l'emprise des triangles
  avec celle du niveau natif. 249 tuiles ont des triangles ; 686451 triangles
  à 32 m et 54499830 m² couverts. Le pixel isolé reste exclu.
- `verify-lod.js` : dérivé des contrôles de l'application par build_entry.py.
  Seules les attentes concernant les anciennes géométries, désormais libérées,
  et les textures temporaires de transition sont adaptées. Les tests de navigation,
  GPS, rayons, calcul original, survol et libération HD sont conservés.
  Des contrôles propres au LOD, au partage HD et aux changements d'image sont ajoutés.
- `tests/local_walker.cjs`, test existant, passe sans modification.
- `test-worker.cjs` : 16 cas de bord et d'intérieur, sorties identiques à la
  géométrie de référence, cache LRU borné, normales finies, transfert de morphing,
  libération et lectures parallèles limitées à quatre.
- `check_restore.py` : extraction temporaire du checkpoint, vérification de tous
  les fichiers originaux et des ressources partagées par SHA256.

Résultats détaillés dans les JSON du dossier. Les mesures sont locales à cette
machine ; elles ne prouvent pas les performances sur tous les ordinateurs.
Les 39 contrôles d'intégration ont passé ; leur résultat est conservé dans
integration-results.json.
Le passage manuel au globe puis le retour à Huertahernando ont également été
vérifiés dans l'entrée de développement.

Sur le laboratoire à quatre tuiles, un aller-retour vers le 2 m reste proche de
60 images/s et la plus longue image observée est passée de 197 ms au premier
prototype à 25 ms après mise en worker. Les uploads ont atteint 8,6 ms ; le
calcul prend environ 86 ms dans le worker et ne bloque plus le rendu.

Dans l'application seule, vue initiale : environ 59–60 images/s, 249 tuiles,
686451 triangles, 21,90 Mio de géométrie, environ 6 Mio de cache MNT, uploads
jusqu'à 1,7 ms dans l'essai observé. Une approche rapide a libéré les tuiles hors
champ (six résidentes dans l'essai). Le chargement des images HD et les gestes
rapides produisent encore des pointes de durée d'image : 169,9 ms observés.
La suite d'intégration, qui charge plusieurs grandes cartes et simule les
commandes, a aussi enregistré 255,5 ms avec deux scènes 3D ouvertes. Ces pics
ne doivent pas être masqués par le débit stabilisé ni attribués uniquement au LOD.

Comparaison exploratoire avec le même instrument et les mêmes caméras, une seule
page 3D ouverte, fichiers locaux déjà visités (benchmark-results.json) :

| Mesure | 1.0.15 | 2.0.1 développement |
| --- | ---: | ---: |
| Prêt initial | 1,60 s | 5,14 s |
| Triangles actifs, vue d'ensemble | 1305728 | 686451 |
| Débit stabilisé, vue d'ensemble | environ 60 images/s | environ 60 images/s |
| Triangles actifs, caméra à la même altitude de 1363,23664 m | 1322272 | 262144 |
| Débit observé, même approche | environ 60 images/s | 47,8 à 60 images/s |
| Plus longue image pendant cette approche | 149,5 ms | 156,9 ms |

Au point d'approche, seules deux tuiles de terrain à 2 m sont résidentes (7,03 Mio
de géométrie), au lieu de conserver le territoire complet. Le 95e percentile de
durée des images stabilisées est voisin de 16,8–16,9 ms pour les deux versions.
Les uploads de la géométrie détaillée ont atteint 16,1 ms dans cet essai.
Le démarrage a été réduit de 11,18 s à 5,14 s en supprimant une attente d'écran
par tuile pendant le préchargement et en parallélisant les lectures voisines.
Il demeure plus lent que la 1.0.15 : c'est un compromis explicite de cette version
de développement, à améliorer si l'essai utilisateur le juge gênant. Ces quelques
observations ne remplacent pas un benchmark statistique à cache et matériel contrôlés.
La capture JSON de l'approche LOD indique 47,8 images/s alors que le relevé visuel
précédent indiquait 60 : le débit court terme varie durant les chargements et
captures. Ne pas présenter ces valeurs comme une garantie de 60 images/s constants.

La mémoire RAM totale du processus et la mémoire GPU du pilote ne sont pas
mesurées. Le budget géométrique exclut le terrain invisible conservé, les images,
le moteur, les buffers transitoires et le pilote. Le cache MNT et les géométries
ne représentent donc pas la consommation totale de l'application.

## Fichiers et sauvegarde

Fichiers originaux modifiés : **aucun**. Les nouveaux fichiers sont index-lod.html,
les deux entrées benchmark-legacy.html / benchmark-lod.html et le dossier terrain-lod.
Les entrées sont générées depuis le HTML d'origine par build_entry.py, donc les
commandes et styles continuent d'être ceux de la référence dans la copie Exodus.
Les fonctions principales nouvelles sont geometry.js, worker.js et integration.js.
prototype.js et index.html du laboratoire offrent les comparaisons manuelles.
benchmark.js est un instrument identique de mesure sur les deux versions.
Les scripts d'audit, de vérification et leurs JSON/PNG sont des résultats légers.

Les ressources inchangées (environ 1,75 Go) restent physiquement à leur emplacement.
Les géométries LOD sont générées en mémoire ; volume supplémentaire de données de
terrain et d'images : **zéro**. Les fichiers de code, rapports et petites captures
ajoutent seulement quelques centaines de kilo-octets. Aucun transfert de données
ou déploiement n'a été réalisé.

La sauvegarde initiale exacte se trouve dans
`../../Sauvegarde/exodus-1.0.15-before-lod/` depuis ce dossier, avec archive du
code/configuration de 260186 octets et manifeste SHA256 des ressources conservées.
Tag Git `exodus-1.0.15-before-lod-20261018`, commit 4033029. Le tag seul ne conserve
pas les modifications initiales non enregistrées : garder impérativement l'archive.

Retour arrière normal : ouvrir `/index.html`. Aucun fichier original ne doit être
restauré, car l'entrée de développement est séparée. En cas de modification future
des originaux, conserver d'abord les nouveaux travaux, extraire working-copy.zip
dans un dossier temporaire, vérifier les empreintes et restaurer les fichiers
archivés. Ne pas supprimer les ressources originales ni utiliser un reset Git
pour reconstituer l'état non enregistré. La procédure d'extraction et les
empreintes ont été testées ; une restauration destructive n'a pas été effectuée.

## Limites à garder en vue avant une publication

Le chargement initial réutilise encore le chargeur de scène existant : il lit le
binaire d'origine et crée ses surfaces avant de libérer celles remplacées. Cela
préserve la compatibilité mais conserve un coût transitoire au démarrage.
Les transitions sont sérialisées, donc l'ensemble des zones éloignées peut mettre
plusieurs secondes à rejoindre sa résolution cible après un gros déplacement.
Le terrain invisible de sélection conserve sa précision d'origine, volontairement.

Les tests automatisés ne constituent pas une revue visuelle exhaustive de tous les
objets, repères et calques, ni une validation de tous les trajets du Marcheur.
Le matériel modeste, la distribution hors connexion et le serveur d'hébergement
doivent faire l'objet d'un essai ciblé avant publication. Aucun transfert ou
déploiement ne doit être lancé sans l'accord demandé dans le cahier des charges.
