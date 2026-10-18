# Fossiles à Huertahernando — secteurs d’observation

État de l’étude : 16 octobre 2026. Périmètre : **commune de Huertahernando uniquement**. Aucun gisement ni point de découverte précis n’est publié ici.

## Résultat

| Rang | Secteur | Niveau | Ce que les sources établissent | À vérifier sur place |
|---|---|---|---|---|
| 1 | Nord-ouest, entre Fuenmayor et Cerro Cuerno | Priorité 2 | Une coupe jurassique et des ammonites du Toarcien supérieur ont été publiées dans ce secteur. La formation Turmiel traverse le territoire. | Retrouver la coupe exacte, constater l’exposition actuelle et l’accès par chemin ouvert. |
| 2 | Sud-ouest, contact Jurassique–Crétacé | Priorité 2 | La figure 13 de l’étude de 1975 décrit des marnes et margocalcaires à fossiles des zones Insigne et Pseudoradiosa. | Retrouver le contact à l’échelle du terrain, vérifier si la roche est encore visible. |
| 3 | Nord, formation Barahona / Cerro del Pez | Priorité 3 | L’IGME décrit des niveaux riches en brachiopodes et bivalves et cartographie l’unité dans la commune. | Identifier un affleurement réellement accessible et non couvert par le sol ou la végétation. |
| 4 | Nord-est, calcaires du Pedregal | Priorité 3 | L’IGME décrit des corniches de calcaires dont certains niveaux basaux portent ammonites, bivalves, gastéropodes et bélemnites. | Repérer les niveaux basaux exposés; la zone cartographique entière n’est pas fossilifère en surface. |

**Aucune priorité 1 n’est attribuée à ce stade** : les publications attestent des coupes, mais l’exposition actuelle, l’accès et les coordonnées exactes n’ont pas été confirmés. Les contours d’Exodus croisent les unités de la carte GEODE avec la limite communale. Ils servent à orienter une reconnaissance, pas à indiquer une découverte sur chaque parcelle. Les repères à l’intérieur de ces contours sont de simples étiquettes de zone.

## Observation suggérée

Commencer par les chemins ouverts près des secteurs nord-ouest puis sud-ouest. Chercher des couches de marne et de calcaire naturellement mises à nu et photographier leur contexte. Les ammonites, brachiopodes et bivalves peuvent parfois se reconnaître à l’œil nu; les microfossiles demandent une loupe ou une analyse. Ne pas entrer dans une propriété sans accord, ni creuser ou prélever sans autorisation. L’état des chemins et les règles de protection doivent être vérifiés avant la visite.

## Ce qui manque pour des points précis

Les publications consultées donnent des lieux et des coupes, mais aucune position EPSG:25830 fiable de leur surface observable actuelle. Il manque une reconnaissance géoréférencée du terrain, des photographies récentes des affleurements, et une confirmation de l’accès. Le modèle de terrain et les orthophotos seuls ne prouvent pas que des fossiles sont visibles.

## Sources

- Comas-Rengifo, M. J. et Goy, A. (1975), [*Estratigrafía y paleontología del Jurásico de Ribarredonda (Guadalajara)*](https://www.researchgate.net/publication/284826922_Estratigrafia_y_paleontologia_del_Jurasico_de_Ribarredonda_Guadalajara), *Estudios Geológicos*, 31, 297–339 : secteurs de Huertahernando, figures 13–14.
- IGME, [notice de la feuille 513, Zaorejas](https://info.igme.es/cartografiadigital/datos/magna50/memorias/MMagna0513.pdf), sections 2.3.2–2.3.4 : faunes et affleurements jurassiques.
- IGME, [service géologique GEODE 1:50 000](https://mapas.igme.es/gis/rest/services/Cartografia_Geologica/IGME_Geode_50/MapServer) : unités 146, 149 et 155.
- IGN, [limites municipales](https://services1.arcgis.com/nCKYwcSONQTkPA4K/ArcGIS/rest/services/Municipios/FeatureServer/0) : géométrie de Huertahernando, code INE 19148; source IGN reprise dans le service (données 2015).

## Traitement des données

Exodus lit `assets/fossiles_huertahernando.json`. Les polygones viennent du service GEODE, sont recoupés par la limite municipale, puis par des secteurs directionnels indicatifs décrits dans le fichier. Les limites rectilignes de ces secteurs sont un choix de présentation de l’étude : ce ne sont pas des contacts géologiques ni des limites d’affleurement. Coordonnées ETRS89 / UTM 30N, EPSG:25830. Le calque est distinct de la carte géologique et des calques éditables.
