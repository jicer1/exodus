/* Automatic interface language selection: French fallback, Spanish and English. */
(function() {
    "use strict";

    var dictionaries = {
        en: {
            "Calques ▼": "Layers ▼",
            "Calques ▲": "Layers ▲",
            "Modifier Parideras": "Edit Parideras",
            "Ajouter sur la carte": "Add on map",
            "Enregistrer": "Save",
            "Sélectionne Modifier pour gérer les repères.": "Select Edit to manage markers.",
            "Clique un emplacement sur le terrain.": "Click a location on the terrain.",
            "Déplacer": "Move",
            "Renommer": "Rename",
            "Supprimer": "Delete",
            "Repère supprimé. Enregistre pour conserver la modification.": "Marker deleted. Save to keep the change.",
            "Position non détectée.": "Position not detected.",
            "Nom modifié. Enregistre pour le conserver.": "Name changed. Save to keep it.",
            "Modification effectuée. Enregistre pour la conserver.": "Change made. Save to keep it.",
            "Lecture de la position…": "Reading position…",
            "Marqueurs enregistrés dans parideras_edit.json.": "Markers saved in parideras_edit.json.",
            "Enregistrement désactivé sur ce serveur.": "Saving is disabled on this server.",
            "Enregistrement impossible sur ce serveur.": "Unable to save on this server.",
            "Clique la nouvelle position du repère ": "Click the marker’s new position ",
            "Aimantation des points proches": "Magnetism of nearby points",
            "Lissage spline final": "Final spline smoothing",
            "Marcheur lisse": "Smooth walker",
            "Marcheur aimanté": "Magnetized walker",
            "Simulateur en marche.": "Simulator running.",
            "Arrivée. Tu peux encore orienter la caméra, ou quitter le simulateur.": "Arrived. You can still orient the camera or exit the simulator.",
            "Simulateur prêt au départ. Règle les curseurs, puis démarre.": "Simulator ready at the start. Adjust the sliders, then start.",
            "Commande inconnue. Essaie edit.": "Unknown command. Try edit.",
            "Google Earth + tracé KML": "Google Earth + KML route",
            "Ouvrir Google Earth au départ et télécharger le tracé": "Open Google Earth at the start and download the route",
            "Calcule un trajet avant l’export": "Calculate a route before exporting",
            "Module du marcheur indisponible": "Walker module unavailable",
            "Google Earth ouvert au départ — KML dans Téléchargements : huerta-babylone-trace.kml": "Google Earth opened at the start — KML in Downloads: huerta-babylone-trace.kml",
            "Campos abuelo": "Campos abuelo",
            "Repère Campos abuelo": "Campos abuelo marker",
            "Choisissez et validez une zone depuis Terre.": "Choose and validate a zone from Earth.",
            "Clique sur « Choisir plusieurs points » pour commencer un trajet.": "Click “Choose multiple points” to start a route.",
            "Marcheur en préparation pour ce lieu.": "Walker preparing for this location.",
            "Relief : Mapzen Terrain Tiles · sources et crédits": "Relief: Mapzen Terrain Tiles · sources and credits",
            "Coordonnées invalides : latitude de −90 à 90, longitude de −180 à 180.": "Invalid coordinates: latitude −90 to 90, longitude −180 to 180.",
            "La recherche par nom est temporairement indisponible. Réessayez ou saisissez des coordonnées GPS.": "Name search is temporarily unavailable. Try again or enter GPS coordinates.",
            "Le repère indique le lieu choisi sur le globe.": "The marker shows the selected place on the globe.",
            "Lieu choisi :": "Selected place:",
            "Patientez un instant avant une nouvelle recherche.": "Wait a moment before searching again.",
            "Recherche du lieu…": "Searching for the place…",
            "Saisissez une commune ou des coordonnées GPS.": "Enter a town or GPS coordinates.",
            "Chargement de Huerta en cours…": "Loading Huerta…",
            "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.": "Detailed images are temporarily unavailable. You can continue exploring with the overview.",
            "Luminosité du globe": "Globe brightness",
            "Quitte le simulateur de marche avant de passer sur Terre.": "Exit the walking simulator before switching to Earth.",
            "Sur Terre": "On Earth",
            "Valider cette zone": "Validate this zone",
            "Voir la zone détaillée": "View the detailed area",
            "Zone choisie": "Selected area",
            "Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone.": "Zoom in closely, move the terrain under the frame, or search for a place, then validate this area.",
            "Certaines images sont indisponibles. Revenez sur Terre pour réessayer.": "Some images are unavailable. Return to Earth to try again.",
            "Chargement du relief…": "Loading relief…",
            "Détail variable selon la source": "Detail varies by source",
            "Images de la zone": "Area images",
            "Relief chargé": "Relief loaded",
            "Réessayer le relief": "Retry relief",
            "Vue locale de la zone choisie": "Local view of the selected area",
            "Chargement du terrain…": "Loading terrain…",
            "Création : Jacinto Costoso": "Created by: Jacinto Costoso",
            "Imagerie dérivée : IGN Espagne · CC BY 4.0 — Crédits": "Imagery: IGN Spain · CC BY 4.0 — Credits",
            "Commandes d’affichage Huerta": "Huerta display commands",
            "Commande d’affichage": "Display command",
            "Commande : off calque / on calque / off test / on test": "Command: off calque / on calque / off test / on test",
            "Exécuter la commande": "Run command",
            "Panneaux des calques masqués.": "Layer panels hidden.",
            "Panneaux des calques visibles.": "Layer panels shown.",
            "Panneaux de test masqués.": "Test panels hidden.",
            "Panneaux de test visibles. Les calques gardent leur réglage séparé.": "Test panels shown. Layers keep their separate setting.",
            "Commande inconnue. Essaie on/off calque ou on/off test.": "Unknown command. Try on/off calque or on/off test.",
            "Google Earth — pivot": "Google Earth — pivot",
            "Ouvrir Google Earth à la position du dernier pivot": "Open Google Earth at the last pivot position",
            "Définis un pivot avec le clic milieu ou droit": "Set a pivot with the middle or right mouse button",
            "Aucun pivot : clique sur le terrain d'abord": "No pivot: click the terrain first",
            "Parideras": "Parideras",
            "Voir": "View",
            "Centrer la caméra sur les repères Parideras": "Center the camera on the Parideras markers",
            "Marcheur": "Walker",
            "Choisir plusieurs points": "Choose multiple points",
            "Rechoisir plusieurs points": "Choose points again",
            "Refaire le calcul": "Recalculate",
            "Calculer le trajet": "Calculate route",
            "Temps écoulé : —": "Elapsed time: —",
            "Distance : —": "Distance: —",
            "Marche estimée à 4–5 km/h : —": "Estimated walking time at 4–5 km/h: —",
            "Pente de référence": "Reference slope",
            "Pente maximale acceptée": "Maximum allowed slope",
            "Temps par option": "Time per option",
            "5 min par option": "5 min per option",
            "Messages du calcul": "Calculation messages",
            "Messages du calcul Marcheur": "Walker calculation messages",
            "Fermer": "Close",
            "Calques des trajets": "Route layers",
            "Hauteur au-dessus du trajet": "Height above route",
            "Vitesse de survol": "Flyover speed",
            "Inclinaison vers le sol": "Downward camera angle",
            "Entrer dans le simulateur de marche": "Enter walking simulator",
            "Démarrer le marcheur": "Start walker",
            "Pause": "Pause",
            "Reprendre": "Resume",
            "Quitter": "Exit",
            "Calcule un trajet pour lancer le survol.": "Calculate a route to start the flyover.",
            "Impossible d’entrer dans le simulateur.": "Unable to enter the simulator.",
            "Simulateur prêt. Règle les curseurs, puis démarre le marcheur.": "Simulator ready. Adjust the sliders, then start the walker.",
            "Simulateur quitté. La vue précédente est restaurée.": "Simulator closed. The previous view has been restored.",
            "Survol terminé. La navigation est rétablie.": "Flyover complete. Navigation is restored.",
            "Arrête le survol avant de choisir d’autres points.": "Stop the flyover before choosing more points.",
            "Calcul annulé. Les points choisis restent sur la carte.": "Calculation cancelled. The selected points remain on the map.",
            "Prêt. Choisis deux points sur la carte.": "Ready. Choose two points on the map.",
            "Prêt. Choisis les points du trajet dans l’ordre.": "Ready. Choose route points in order.",
            "Lecture du point…": "Reading point…",
            "Point non détecté. Réessaie sur le terrain.": "Point not detected. Try again on the terrain.",
            "Ajoute au moins un second point.": "Add at least one more point.",
            "Calcul de l’étape ": "Calculating leg ",
            "Départ": "Start",
            "Arrivée": "Finish",
            "Étape ": "Leg ",
            "Temps écoulé : ": "Elapsed time: ",
            "Distance : ": "Distance: ",
            "Marche estimée à 4–5 km/h : ": "Estimated walking time at 4–5 km/h: ",
            "Calcul du trajet en passant par les ": "Calculating a route through ",
            " points, dans l’ordre…": " points in order…",
            "Calcul en cours — annuler": "Calculating — cancel",
            "Terminer les points (": "Finish selecting points (",
            "En attente du point suivant": "Waiting for the next point",
            "En attente du point suivant. Ajoute un second point pour lancer le calcul.": "Waiting for the next point. Add another point to start the calculation.",
            "Clique les points successifs du trajet, puis relance ce bouton pour calculer.": "Click the route points in order, then press this button again to calculate.",
            "Point 1 choisi. Clique le point suivant.": "Point 1 selected. Click the next point.",
            " choisi. Continue dans l’ordre, puis relance ce bouton pour calculer.": " selected. Continue in order, then press this button again to calculate.",
            "Points choisis. Relance le bouton pour calculer.": "Points selected. Press the button again to calculate.",
            "Calcul de l’étape ": "Calculating leg ",
            "Préparation du calcul…": "Preparing calculation…",
            "Préparation impossible. Voir Messages.": "Unable to prepare calculation. See Messages.",
            "Calcul en cours…": "Calculation in progress…",
            "Calcul interrompu. Voir Messages.": "Calculation interrupted. See Messages.",
            "Calcul annulé. Choisis le premier point.": "Calculation cancelled. Choose the first point.",
            "Arrête le survol avant de choisir d’autres points.": "Stop the flyover before choosing more points.",
            "Pente de référence du trajet, de 5 à 12 degrés": "Reference route slope, from 5 to 12 degrees",
            "Plafond de pente accepté du trajet, de 5 à 70 degrés": "Maximum allowed route slope, from 5 to 70 degrees",
            "Temps maximal de calcul par option, en secondes": "Maximum calculation time per option, in seconds",
            "Hauteur de caméra au-dessus du trajet, en mètres": "Camera height above route, in metres",
            "Vitesse de caméra, en mètres par seconde": "Camera speed, in metres per second",
            "Inclinaison de la caméra vers le sol, en degrés depuis l'horizontale": "Downward camera angle in degrees from horizontal"
            ,"Langue :": "Language:",
            "Automatique": "Automatic"
        },
        es: {
            "Calques ▼": "Capas ▼",
            "Calques ▲": "Capas ▲",
            "Modifier Parideras": "Editar Parideras",
            "Ajouter sur la carte": "Añadir al mapa",
            "Enregistrer": "Guardar",
            "Sélectionne Modifier pour gérer les repères.": "Selecciona Editar para gestionar las marcas.",
            "Clique un emplacement sur le terrain.": "Haz clic en un lugar del terreno.",
            "Déplacer": "Mover",
            "Renommer": "Renombrar",
            "Supprimer": "Eliminar",
            "Repère supprimé. Enregistre pour conserver la modification.": "Marca eliminada. Guarda para conservar el cambio.",
            "Position non détectée.": "Posición no detectada.",
            "Nom modifié. Enregistre pour le conserver.": "Nombre cambiado. Guarda para conservarlo.",
            "Modification effectuée. Enregistre pour la conserver.": "Cambio realizado. Guarda para conservarlo.",
            "Lecture de la position…": "Leyendo la posición…",
            "Marqueurs enregistrés dans parideras_edit.json.": "Marcas guardadas en parideras_edit.json.",
            "Enregistrement désactivé sur ce serveur.": "El guardado está desactivado en este servidor.",
            "Enregistrement impossible sur ce serveur.": "No se puede guardar en este servidor.",
            "Clique la nouvelle position du repère ": "Haz clic en la nueva posición de la marca ",
            "Aimantation des points proches": "Imantación de puntos cercanos",
            "Lissage spline final": "Suavizado spline final",
            "Marcheur lisse": "Caminante suavizado",
            "Marcheur aimanté": "Caminante imantado",
            "Simulateur en marche.": "Simulador en marcha.",
            "Arrivée. Tu peux encore orienter la caméra, ou quitter le simulateur.": "Llegada. Aún puedes orientar la cámara o salir del simulador.",
            "Simulateur prêt au départ. Règle les curseurs, puis démarre.": "Simulador listo al inicio. Ajusta los controles y empieza.",
            "Commande inconnue. Essaie edit.": "Comando desconocido. Prueba edit.",
            "Google Earth + tracé KML": "Google Earth + ruta KML",
            "Ouvrir Google Earth au départ et télécharger le tracé": "Abrir Google Earth al inicio y descargar la ruta",
            "Calcule un trajet avant l’export": "Calcula una ruta antes de exportar",
            "Module du marcheur indisponible": "Módulo del caminante no disponible",
            "Google Earth ouvert au départ — KML dans Téléchargements : huerta-babylone-trace.kml": "Google Earth abierto al inicio — KML en Descargas: huerta-babylone-trace.kml",
            "Campos abuelo": "Campos abuelo",
            "Repère Campos abuelo": "Marca de Campos abuelo",
            "Choisissez et validez une zone depuis Terre.": "Elige y valida una zona desde Tierra.",
            "Clique sur « Choisir plusieurs points » pour commencer un trajet.": "Haz clic en « Elegir varios puntos » para iniciar una ruta.",
            "Marcheur en préparation pour ce lieu.": "Caminante preparando este lugar.",
            "Relief : Mapzen Terrain Tiles · sources et crédits": "Relieve: Mapzen Terrain Tiles · fuentes y créditos",
            "Coordonnées invalides : latitude de −90 à 90, longitude de −180 à 180.": "Coordenadas no válidas: latitud de −90 a 90, longitud de −180 a 180.",
            "La recherche par nom est temporairement indisponible. Réessayez ou saisissez des coordonnées GPS.": "La búsqueda por nombre no está disponible temporalmente. Inténtalo de nuevo o introduce coordenadas GPS.",
            "Le repère indique le lieu choisi sur le globe.": "La marca indica el lugar elegido en el globo.",
            "Lieu choisi :": "Lugar elegido:",
            "Patientez un instant avant une nouvelle recherche.": "Espera un momento antes de buscar de nuevo.",
            "Recherche du lieu…": "Buscando el lugar…",
            "Saisissez une commune ou des coordonnées GPS.": "Introduce un municipio o coordenadas GPS.",
            "Chargement de Huerta en cours…": "Cargando Huerta…",
            "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.": "Las imágenes detalladas no están disponibles temporalmente. Puedes seguir explorando con la vista general.",
            "Luminosité du globe": "Brillo del globo",
            "Quitte le simulateur de marche avant de passer sur Terre.": "Sal del simulador de caminata antes de pasar a Tierra.",
            "Sur Terre": "En Tierra",
            "Valider cette zone": "Validar esta zona",
            "Voir la zone détaillée": "Ver la zona detallada",
            "Zone choisie": "Zona elegida",
            "Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone.": "Acerca mucho el zoom, mueve el terreno bajo el marco o busca un lugar y valida esta zona.",
            "Certaines images sont indisponibles. Revenez sur Terre pour réessayer.": "Algunas imágenes no están disponibles. Vuelve a Tierra para intentarlo de nuevo.",
            "Chargement du relief…": "Cargando el relieve…",
            "Détail variable selon la source": "El detalle varía según la fuente",
            "Images de la zone": "Imágenes de la zona",
            "Relief chargé": "Relieve cargado",
            "Réessayer le relief": "Reintentar el relieve",
            "Vue locale de la zone choisie": "Vista local de la zona elegida",
            "Chargement du terrain…": "Cargando el terreno…",
            "Création : Jacinto Costoso": "Creación: Jacinto Costoso",
            "Imagerie dérivée : IGN Espagne · CC BY 4.0 — Crédits": "Imágenes: IGN España · CC BY 4.0 — Créditos",
            "Commandes d’affichage Huerta": "Controles de visualización de Huerta",
            "Commande d’affichage": "Comando de visualización",
            "Commande : off calque / on calque / off test / on test": "Comando: off calque / on calque / off test / on test",
            "Exécuter la commande": "Ejecutar comando",
            "Panneaux des calques masqués.": "Paneles de capas ocultos.",
            "Panneaux des calques visibles.": "Paneles de capas visibles.",
            "Panneaux de test masqués.": "Paneles de prueba ocultos.",
            "Panneaux de test visibles. Les calques gardent leur réglage séparé.": "Paneles de prueba visibles. Las capas mantienen su ajuste independiente.",
            "Commande inconnue. Essaie on/off calque ou on/off test.": "Comando desconocido. Prueba on/off calque o on/off test.",
            "Google Earth — pivot": "Google Earth — punto de giro",
            "Ouvrir Google Earth à la position du dernier pivot": "Abrir Google Earth en la posición del último punto de giro",
            "Définis un pivot avec le clic milieu ou droit": "Define un punto de giro con el botón central o derecho del ratón",
            "Aucun pivot : clique sur le terrain d'abord": "No hay punto de giro: haz clic primero en el terreno",
            "Parideras": "Parideras",
            "Voir": "Ver",
            "Centrer la caméra sur les repères Parideras": "Centrar la cámara en las marcas de Parideras",
            "Marcheur": "Caminante",
            "Choisir plusieurs points": "Elegir varios puntos",
            "Rechoisir plusieurs points": "Volver a elegir los puntos",
            "Refaire le calcul": "Recalcular",
            "Calculer le trajet": "Calcular la ruta",
            "Temps écoulé : —": "Tiempo transcurrido: —",
            "Distance : —": "Distancia: —",
            "Marche estimée à 4–5 km/h : —": "Tiempo estimado a 4–5 km/h: —",
            "Pente de référence": "Pendiente de referencia",
            "Pente maximale acceptée": "Pendiente máxima permitida",
            "Temps par option": "Tiempo por opción",
            "5 min par option": "5 min por opción",
            "Messages du calcul": "Mensajes del cálculo",
            "Messages du calcul Marcheur": "Mensajes del cálculo del caminante",
            "Fermer": "Cerrar",
            "Calques des trajets": "Capas de rutas",
            "Hauteur au-dessus du trajet": "Altura sobre la ruta",
            "Vitesse de survol": "Velocidad del vuelo",
            "Inclinaison vers le sol": "Inclinación hacia el suelo",
            "Entrer dans le simulateur de marche": "Entrar en el simulador de caminata",
            "Démarrer le marcheur": "Iniciar caminante",
            "Pause": "Pausa",
            "Reprendre": "Reanudar",
            "Quitter": "Salir",
            "Calcule un trajet pour lancer le survol.": "Calcula una ruta para iniciar el vuelo.",
            "Impossible d’entrer dans le simulateur.": "No se puede entrar en el simulador.",
            "Simulateur prêt. Règle les curseurs, puis démarre le marcheur.": "Simulador listo. Ajusta los controles y después inicia el caminante.",
            "Simulateur quitté. La vue précédente est restaurée.": "Simulador cerrado. Se ha restaurado la vista anterior.",
            "Survol terminé. La navigation est rétablie.": "Vuelo terminado. La navegación vuelve a estar disponible.",
            "Arrête le survol avant de choisir d’autres points.": "Detén el vuelo antes de elegir otros puntos.",
            "Calcul annulé. Les points choisis restent sur la carte.": "Cálculo cancelado. Los puntos seleccionados siguen en el mapa.",
            "Prêt. Choisis deux points sur la carte.": "Listo. Elige dos puntos en el mapa.",
            "Prêt. Choisis les points du trajet dans l’ordre.": "Listo. Elige los puntos de la ruta en orden.",
            "Lecture du point…": "Leyendo el punto…",
            "Point non détecté. Réessaie sur le terrain.": "Punto no detectado. Inténtalo de nuevo sobre el terreno.",
            "Ajoute au moins un second point.": "Añade al menos un segundo punto.",
            "Calcul de l’étape ": "Calculando el tramo ",
            "Départ": "Salida",
            "Arrivée": "Llegada",
            "Étape ": "Tramo ",
            "Temps écoulé : ": "Tiempo transcurrido: ",
            "Distance : ": "Distancia: ",
            "Marche estimée à 4–5 km/h : ": "Tiempo estimado a 4–5 km/h: ",
            "Calcul du trajet en passant par les ": "Calculando una ruta por ",
            " points, dans l’ordre…": " puntos en orden…",
            "Calcul en cours — annuler": "Calculando — cancelar",
            "Terminer les points (": "Terminar selección de puntos (",
            "En attente du point suivant": "Esperando el siguiente punto",
            "En attente du point suivant. Ajoute un second point pour lancer le calcul.": "Esperando el siguiente punto. Añade otro punto para iniciar el cálculo.",
            "Clique les points successifs du trajet, puis relance ce bouton pour calculer.": "Marca los puntos de la ruta en orden y vuelve a pulsar este botón para calcularla.",
            "Point 1 choisi. Clique le point suivant.": "Punto 1 seleccionado. Haz clic en el siguiente punto.",
            " choisi. Continue dans l’ordre, puis relance ce bouton pour calculer.": " seleccionado. Continúa en orden y vuelve a pulsar este botón para calcular.",
            "Points choisis. Relance le bouton pour calculer.": "Puntos seleccionados. Pulsa el botón de nuevo para calcular.",
            "Préparation du calcul…": "Preparando el cálculo…",
            "Préparation impossible. Voir Messages.": "No se pudo preparar el cálculo. Consulta los mensajes.",
            "Calcul en cours…": "Cálculo en curso…",
            "Calcul interrompu. Voir Messages.": "Cálculo interrumpido. Consulta los mensajes.",
            "Calcul annulé. Choisis le premier point.": "Cálculo cancelado. Elige el primer punto.",
            "Pente de référence du trajet, de 5 à 12 degrés": "Pendiente de referencia de la ruta, de 5 a 12 grados",
            "Plafond de pente accepté du trajet, de 5 à 70 degrés": "Límite de pendiente de la ruta, de 5 a 70 grados",
            "Temps maximal de calcul par option, en secondes": "Tiempo máximo de cálculo por opción, en segundos",
            "Hauteur de caméra au-dessus du trajet, en mètres": "Altura de la cámara sobre la ruta, en metros",
            "Vitesse de caméra, en mètres par seconde": "Velocidad de la cámara, en metros por segundo",
            "Inclinaison de la caméra vers le sol, en degrés depuis l'horizontale": "Inclinación de la cámara hacia el suelo, en grados desde la horizontal"
            ,"Langue :": "Idioma:",
            "Automatique": "Automático"
        },
        ca: {
            "Calques ▼": "Capes ▼",
            "Calques ▲": "Capes ▲",
            "Modifier Parideras": "Edita Parideras",
            "Ajouter sur la carte": "Afegeix al mapa",
            "Enregistrer": "Desa",
            "Sélectionne Modifier pour gérer les repères.": "Selecciona Edita per gestionar les marques.",
            "Clique un emplacement sur le terrain.": "Fes clic en un lloc del terreny.",
            "Déplacer": "Mou",
            "Renommer": "Canvia el nom",
            "Supprimer": "Suprimeix",
            "Repère supprimé. Enregistre pour conserver la modification.": "Marca suprimida. Desa per conservar el canvi.",
            "Position non détectée.": "Posició no detectada.",
            "Nom modifié. Enregistre pour le conserver.": "Nom canviat. Desa per conservar-lo.",
            "Modification effectuée. Enregistre pour la conserver.": "Canvi fet. Desa per conservar-lo.",
            "Lecture de la position…": "Llegint la posició…",
            "Marqueurs enregistrés dans parideras_edit.json.": "Marques desades a parideras_edit.json.",
            "Enregistrement désactivé sur ce serveur.": "El desat està desactivat en aquest servidor.",
            "Enregistrement impossible sur ce serveur.": "No es pot desar en aquest servidor.",
            "Clique la nouvelle position du repère ": "Fes clic a la nova posició de la marca ",
            "Aimantation des points proches": "Imantació dels punts propers",
            "Lissage spline final": "Suavitzat spline final",
            "Marcheur lisse": "Caminant suavitzat",
            "Marcheur aimanté": "Caminant imantat",
            "Simulateur en marche.": "Simulador en marxa.",
            "Arrivée. Tu peux encore orienter la caméra, ou quitter le simulateur.": "Arribada. Encara pots orientar la càmera o sortir del simulador.",
            "Simulateur prêt au départ. Règle les curseurs, puis démarre.": "Simulador preparat a l’inici. Ajusta els controls i inicia’l.",
            "Commande inconnue. Essaie edit.": "Comanda desconeguda. Prova edit.",
            "Google Earth + tracé KML": "Google Earth + trajecte KML",
            "Ouvrir Google Earth au départ et télécharger le tracé": "Obre Google Earth a l’inici i baixa el trajecte",
            "Calcule un trajet avant l’export": "Calcula un trajecte abans d’exportar",
            "Module du marcheur indisponible": "Mòdul del caminant no disponible",
            "Google Earth ouvert au départ — KML dans Téléchargements : huerta-babylone-trace.kml": "Google Earth obert a l’inici — KML a Descàrregues: huerta-babylone-trace.kml",
            "Campos abuelo": "Campos abuelo",
            "Repère Campos abuelo": "Marca de Campos abuelo",
            "Choisissez et validez une zone depuis Terre.": "Tria i valida una zona des de Terra.",
            "Clique sur « Choisir plusieurs points » pour commencer un trajet.": "Fes clic a « Tria diversos punts » per iniciar un trajecte.",
            "Marcheur en préparation pour ce lieu.": "Caminant preparant aquest lloc.",
            "Relief : Mapzen Terrain Tiles · sources et crédits": "Relleu: Mapzen Terrain Tiles · fonts i crèdits",
            "Coordonnées invalides : latitude de −90 à 90, longitude de −180 à 180.": "Coordenades no vàlides: latitud de −90 a 90, longitud de −180 a 180.",
            "La recherche par nom est temporairement indisponible. Réessayez ou saisissez des coordonnées GPS.": "La cerca per nom no està disponible temporalment. Torna-ho a provar o introdueix coordenades GPS.",
            "Le repère indique le lieu choisi sur le globe.": "La marca indica el lloc triat al globus.",
            "Lieu choisi :": "Lloc triat:",
            "Patientez un instant avant une nouvelle recherche.": "Espera un moment abans de tornar a cercar.",
            "Recherche du lieu…": "Cercant el lloc…",
            "Saisissez une commune ou des coordonnées GPS.": "Introdueix un municipi o coordenades GPS.",
            "Chargement de Huerta en cours…": "Carregant Huerta…",
            "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.": "Les imatges detallades no estan disponibles temporalment. Pots continuar explorant amb la vista general.",
            "Luminosité du globe": "Brillantor del globus",
            "Quitte le simulateur de marche avant de passer sur Terre.": "Surt del simulador de caminada abans de passar a Terra.",
            "Sur Terre": "A Terra",
            "Valider cette zone": "Valida aquesta zona",
            "Voir la zone détaillée": "Veure la zona detallada",
            "Zone choisie": "Zona triada",
            "Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone.": "Fes molt zoom, mou el terreny sota el marc o cerca un lloc i valida aquesta zona.",
            "Certaines images sont indisponibles. Revenez sur Terre pour réessayer.": "Algunes imatges no estan disponibles. Torna a Terra per tornar-ho a provar.",
            "Chargement du relief…": "Carregant el relleu…",
            "Détail variable selon la source": "El detall varia segons la font",
            "Images de la zone": "Imatges de la zona",
            "Relief chargé": "Relleu carregat",
            "Réessayer le relief": "Torna a provar el relleu",
            "Vue locale de la zone choisie": "Vista local de la zona triada",
            "Chargement du terrain…": "Carregant el terreny…",
            "Création : Jacinto Costoso": "Creació: Jacinto Costoso",
            "Imagerie dérivée : IGN Espagne · CC BY 4.0 — Crédits": "Imatges: IGN Espanya · CC BY 4.0 — Crèdits",
            "Commandes d’affichage Huerta": "Comandes de visualització d’Huerta",
            "Commande d’affichage": "Comanda de visualització",
            "Exécuter la commande": "Executa la comanda",
            "Panneaux des calques masqués.": "Panells de capes ocults.",
            "Panneaux des calques visibles.": "Panells de capes visibles.",
            "Panneaux de test masqués.": "Panells de prova ocults.",
            "Panneaux de test visibles. Les calques gardent leur réglage séparé.": "Panells de prova visibles. Les capes mantenen el seu ajust independent.",
            "Commande inconnue. Essaie on/off calque ou on/off test.": "Comanda desconeguda. Prova on/off calque o on/off test.",
            "Voir": "Mostra",
            "Marcheur": "Caminant",
            "Choisir plusieurs points": "Tria diversos punts",
            "Rechoisir plusieurs points": "Torna a triar els punts",
            "Refaire le calcul": "Recalcula",
            "Calculer le trajet": "Calcula el trajecte",
            "Temps écoulé : —": "Temps transcorregut: —",
            "Temps écoulé : ": "Temps transcorregut: ",
            "Distance : —": "Distància: —",
            "Distance : ": "Distància: ",
            "Marche estimée à 4–5 km/h : —": "Temps estimat caminant a 4–5 km/h: —",
            "Marche estimée à 4–5 km/h : ": "Temps estimat caminant a 4–5 km/h: ",
            "Marche selon la pente : —": "Caminada segons el pendent: —",
            "Marche selon la pente : ": "Caminada segons el pendent: ",
            "Correction globale de vitesse": "Correcció global de velocitat",
            "Pente de référence": "Pendent de referència",
            "Pente maximale acceptée": "Pendent màxim admès",
            "Temps par option": "Temps per opció",
            "Messages du calcul": "Missatges del càlcul",
            "Messages du calcul Marcheur": "Missatges del càlcul del caminant",
            "Fermer": "Tanca",
            "Calques des trajets": "Capes dels trajectes",
            "Hauteur au-dessus du trajet": "Alçada sobre el trajecte",
            "Vitesse de survol": "Velocitat del sobrevol",
            "Entrer dans le simulateur de marche": "Entra al simulador de caminada",
            "Démarrer le marcheur": "Inicia el caminant",
            "Pause": "Pausa",
            "Reprendre": "Continua",
            "Quitter": "Surt",
            "Calcule un trajet pour lancer le survol.": "Calcula un trajecte per iniciar el sobrevol.",
            "Impossible d’entrer dans le simulateur.": "No es pot entrar al simulador.",
            "Simulateur prêt. Règle les curseurs, puis démarre le marcheur.": "Simulador preparat. Ajusta els controls i inicia el caminant.",
            "Simulateur quitté. La vue précédente est restaurée.": "Simulador tancat. S’ha restaurat la vista anterior.",
            "Arrête le survol avant de choisir d’autres points.": "Atura el sobrevol abans de triar altres punts.",
            "Calcul annulé. Les points choisis restent sur la carte.": "Càlcul cancel·lat. Els punts triats es mantenen al mapa.",
            "Prêt. Choisis deux points sur la carte.": "Preparat. Tria dos punts al mapa.",
            "Prêt. Choisis les points du trajet dans l’ordre.": "Preparat. Tria els punts del trajecte en ordre.",
            "Lecture du point…": "Llegint el punt…",
            "Point non détecté. Réessaie sur le terrain.": "Punt no detectat. Torna-ho a provar sobre el terreny.",
            "Ajoute au moins un second point.": "Afegeix almenys un segon punt.",
            "Départ": "Sortida",
            "Arrivée": "Arribada",
            "Calcul en cours — annuler": "Càlcul en curs — cancel·la",
            "Terminer les points (": "Acaba la selecció de punts (",
            "En attente du point suivant": "Esperant el punt següent",
            "En attente du point suivant. Ajoute un second point pour lancer le calcul.": "Esperant el punt següent. Afegeix un altre punt per iniciar el càlcul.",
            "Calcul en cours…": "Càlcul en curs…",
            "Calcul interrompu. Voir Messages.": "Càlcul interromput. Consulta els missatges.",
            "Calcul annulé. Choisis le premier point.": "Càlcul cancel·lat. Tria el primer punt.",
            "Commande : off calque / on calque / off test / on test": "Comanda: off calque / on calque / off test / on test",
            "Google Earth — pivot": "Google Earth — pivot",
            "Ouvrir Google Earth à la position du dernier pivot": "Obre Google Earth a la posició de l’últim pivot",
            "Définis un pivot avec le clic milieu ou droit": "Defineix un pivot amb el clic del mig o dret",
            "Aucun pivot : clique sur le terrain d'abord": "Cap pivot: fes clic primer al terreny",
            "Parideras": "Parideras",
            "Centrer la caméra sur les repères Parideras": "Centra la càmera en les marques de Parideras",
            "5 min par option": "5 min per opció",
            "Inclinaison vers le sol": "Inclinació cap al terra",
            "Inclinaison de la caméra vers le sol, en degrés depuis l'horizontale": "Inclinació de la càmera cap al terra, en graus des de l’horitzontal",
            "Calcul du trajet en passant par les ": "Calculant un trajecte passant pels ",
            " points, dans l’ordre…": " punts, en ordre…",
            "Calcul de l’étape ": "Calculant el tram ",
            "Étape ": "Tram ",
            "Point 1 choisi. Clique le point suivant.": "Punt 1 triat. Fes clic al punt següent.",
            " choisi. Continue dans l’ordre, puis relance ce bouton pour calculer.": " triat. Continua en ordre i torna a prémer aquest botó per calcular.",
            "Points choisis. Relance le bouton pour calculer.": "Punts triats. Torna a prémer el botó per calcular.",
            "Préparation du calcul…": "Preparació del càlcul…",
            "Préparation impossible. Voir Messages.": "No es pot preparar el càlcul. Consulta els missatges.",
            "Survol terminé. La navigation est rétablie.": "Sobrevol acabat. La navegació s’ha restablert.",
            "Temps maximal de calcul par option, en secondes": "Temps màxim de càlcul per opció, en segons",
            "Hauteur de caméra au-dessus du trajet, en mètres": "Alçada de la càmera sobre el trajecte, en metres",
            "Vitesse de caméra, en mètres par seconde": "Velocitat de la càmera, en metres per segon",
            "Pente de référence du trajet, de 5 à 12 degrés": "Pendent de referència del trajecte, de 5 a 12 graus",
            "Plafond de pente accepté du trajet, de 5 à 70 degrés": "Límit de pendent acceptat del trajecte, de 5 a 70 graus",
            "Clique les points successifs du trajet, puis relance ce bouton pour calculer.": "Fes clic als punts successius del trajecte i torna a prémer aquest botó per calcular.",
            "Langue :": "Llengua:",
            "Automatique": "Automàtic"
        }
    };

    var preferences = navigator.languages && navigator.languages.length
        ? navigator.languages.slice()
        : [navigator.language || "fr"];
    var language = "fr";
    for (var preferenceIndex = 0; preferenceIndex < preferences.length; preferenceIndex++) {
        var candidate = String(preferences[preferenceIndex]).toLowerCase().split(/[-_]/)[0];
        if (candidate === "fr" || dictionaries[candidate]) {
            language = candidate;
            break;
        }
    }
    var browserLanguage = language;
    var dictionary = dictionaries[language] || {};

    function setActiveLanguage(nextLanguage) {
        if (language === nextLanguage) return;
        var reverse = Object.keys(dictionary).map(function(source) {
            return [dictionary[source], source];
        }).sort(function(a, b) { return b[0].length - a[0].length; });

        function restoreNode(node) {
            if (node.nodeType === 3) {
                var original = node.nodeValue;
                reverse.forEach(function(pair) {
                    if (pair[0]) original = original.split(pair[0]).join(pair[1]);
                });
                node.nodeValue = original;
            } else if (node.nodeType === 1) {
                ["title", "placeholder", "aria-label"].forEach(function(attribute) {
                    if (!node.hasAttribute(attribute)) return;
                    var value = node.getAttribute(attribute);
                    reverse.forEach(function(pair) {
                        if (pair[0]) value = value.split(pair[0]).join(pair[1]);
                    });
                    node.setAttribute(attribute, value);
                });
                Array.prototype.slice.call(node.childNodes).forEach(restoreNode);
            }
        }

        restoreNode(document.head);
        restoreNode(document.body);
        language = nextLanguage;
        dictionary = dictionaries[language] || {};
        document.documentElement.lang = language;
        translateNode(document.head);
        translateNode(document.body);
        window.HuertaI18n.language = language;
        window.HuertaI18n.t = translate;
    }

    function translate(value) {
        if (Object.prototype.hasOwnProperty.call(dictionary, value)) return dictionary[value];
        return Object.keys(dictionary).sort(function(a, b) { return b.length - a.length; })
            .reduce(function(result, source) {
                return result.indexOf(source) === -1 ? result : result.split(source).join(dictionary[source]);
            }, value);
    }

    function translateNode(node) {
        if (node.nodeType === 3) {
            var raw = node.nodeValue;
            var trimmed = raw.trim();
            var translatedText = translate(trimmed);
            var translated = translatedText === trimmed
                ? raw
                : raw.slice(0, raw.indexOf(trimmed)) + translatedText + raw.slice(raw.indexOf(trimmed) + trimmed.length);
            if (translated !== node.nodeValue) node.nodeValue = translated;
            return;
        }
        if (node.nodeType !== 1) return;
        ["title", "placeholder", "aria-label"].forEach(function(attribute) {
            if (node.hasAttribute(attribute)) {
                var value = node.getAttribute(attribute);
                var translated = translate(value);
                if (translated !== value) node.setAttribute(attribute, translated);
            }
        });
        Array.prototype.slice.call(node.childNodes).forEach(translateNode);
    }

    window.HuertaI18n = {
        language: language,
        t: translate,
        setLanguage: setActiveLanguage
    };
    document.documentElement.lang = language;

    function start() {
        createLanguagePicker();
        translateNode(document.head);
        translateNode(document.body);
        new MutationObserver(function(records) {
            records.forEach(function(record) {
                if (record.type === "characterData") translateNode(record.target);
                else Array.prototype.slice.call(record.addedNodes).forEach(translateNode);
            });
        }).observe(document.body, {subtree:true, childList:true, characterData:true});
    }

    function createLanguagePicker() {
        var panel = document.createElement("fieldset");
        panel.id = "huerta_language_picker";
        panel.setAttribute("aria-label", "Langue");
        var legend = document.createElement("legend");
        legend.textContent = "Langue :";
        panel.appendChild(legend);

        [
            {value:"auto", label:"Automatique"},
            {value:"fr", label:"Français"},
            {value:"en", label:"English"},
            {value:"es", label:"Español"},
            {value:"ca", label:"Català"}
        ].forEach(function(option) {
            var label = document.createElement("label");
            var radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "huerta_language";
            radio.value = option.value;
            radio.checked = option.value === "auto";
            radio.addEventListener("change", function() {
                if (!radio.checked) return;
                if (option.value === "auto") {
                    setActiveLanguage(browserLanguage);
                } else {
                    setActiveLanguage(option.value);
                }
            }, false);
            label.appendChild(radio);
            label.appendChild(document.createTextNode(option.label));
            panel.appendChild(label);
        });
        document.body.appendChild(panel);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, false);
    else start();
})();

