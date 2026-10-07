# Choix d’une zone sur Terre

Après une recherche par nom ou coordonnées GPS, un cadre apparaît au centre de
la vue verticale. Le clic gauche déplace le terrain sous le cadre. La molette
et le déplacement vertical avec le clic droit changent le zoom autour du centre.
Le cadre conserve sa taille au sol, même si sa taille à l’écran change.

Les dimensions sont lues sur le terrain de Huertahernando chargé : 9 354 × 8 880 m.
Les coordonnées du centre sont affichées pendant le déplacement. La validation
capture ce centre et ouvre une scène locale indépendante, en mètres, orientée
est / nord / haut. La projection locale utilise les distances sur une sphère de
rayon 6 371 008,8 m. La précision des images reste celle du fournisseur.

La vue locale reçoit désormais le relief Mapzen Terrain Tiles. Le calcul de
marche local est branché sur cette grille de hauteurs. Le terrain de Huertahernando,
sa caméra et son marcheur restent dans leur propre scène, en pause pendant
l’exploration de Terre ou de la zone choisie.

Depuis l’étape « interface identique », zone.html charge les mêmes fichiers
huerta_webgl.css, config.js, runtime.js, huerta_webgl.js, huerta_hud.js,
huerta_menu.js, huerta_marcheur.js et huerta_commandes.js que la base Exodus.
La navigation est donc celle de Huertahernando, avec les mêmes vitesses,
pivots, limites, gestes et caméra initiale. Le fond est lu dans HuertaConfig.
Ces fichiers constituent la référence partagée pour les prochaines modifications.
La scène locale vit dans un document séparé afin de conserver intégralement
la caméra, les trajets et les commandes de la base au retour.
Les panneaux des calques propres au village sont repris depuis leur interface
existante ; seuls les calques propres au village restent indisponibles.
Le HUD et le bouton Google Earth convertissent les coordonnées depuis le centre
de la zone choisie. L’altitude reste « — » si le relief n’a pas pu être chargé.

Le relief utilise une grille d’environ 30 m, avec une résolution variable des
données sources. Les tuiles Terrarium Web Mercator sont décodées sans correction
de couleur, puis interpolées aux coordonnées géographiques des sommets. Les
hauteurs sont exprimées en mètres, sans amplification verticale. Le maillage
visible et celui des collisions partagent exactement la même géométrie.
Au plus 16 tuiles de relief, avec trois demandes simultanées et délai de 15 s
par source. Le miroir AWS européen est essayé si la source principale échoue.
La mémoire des tuiles décodées est libérée après construction du maillage.
Une panne conserve une vue plane clairement signalée et propose une nouvelle
tentative. Au-delà de 85,051° de latitude, le relief Web Mercator est indisponible.
Le marcheur reste désactivé si le relief n’a pas pu être chargé. Une nouvelle
tentative réussie active ses commandes sans recréer la zone.

Le marcheur local utilise les mêmes panneaux, coûts de marche selon la pente,
limites de pente, points successifs et simulateur que Huertahernando. Sa grille
en mètres provient exactement des sommets du relief affiché, avec les lignes
réordonnées du nord vers le sud pour le calcul. Aucun fichier MNT ni décalage
UTM de Huertahernando n’est utilisé. Le calcul cherche à la pente de référence,
puis relève progressivement le seuil si nécessaire jusqu’au plafond accepté.
Cette première adaptation recherche le trajet sur toute la grille locale ; elle
n’utilise pas les corridors à 2 m ni la reprise par tronçons du MNT de Huerta.
La précision reste celle des données disponibles, environ 30 m ici.
Les points choisis restent les extrémités exactes du parcours. Le trajet lissé
et la caméra suivent les triangles du maillage afin de rester sur son relief.
Le survol conserve le réglage de 0 à 100 km/h, avec 5 km/h au départ, ainsi que
la pause, la reprise et la restauration de la vue en quittant le simulateur.
Il faut quitter le simulateur avant de changer de vue. Chaque scène conserve
son propre parcours. Remplacer une zone interrompt son calcul et ses minuteries.
Vérification : node tests/local_walker.cjs ; essai dans l’interface avec deux
points, plusieurs étapes, simulateur, pause/reprise et retour à Huertahernando.

Les boutons permettent de retrouver Huertahernando, Terre et le lieu choisi.
La dernière zone validée reste disponible pendant la session ; une nouvelle
validation remplace cette zone et libère sa scène, sa texture et ses demandes.

Images locales : même source Sentinel-2 cloudless / EOX et mêmes crédits que
sur le globe. Au plus 64 images de 256 pixels, quatre téléchargements simultanés,
et une mosaïque de 2 048 × 2 048 pixels au maximum. Le niveau est réduit si
nécessaire pour respecter ces limites. Un message signale les images manquantes.
Quitter la vue locale interrompt les demandes en cours ; les images non chargées
reprennent au retour. Les images ne sont pas enregistrées sur le disque par
l’application ; le navigateur applique son cache HTTP habituel.
