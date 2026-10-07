/* Automatic interface language selection: French fallback, Spanish and English. */
(function() {
    "use strict";

    var dictionaries = {
        en: {
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
            "Conseil : en haute montagne, commencez avec deux points et faites un premier calcul.": "Advice: in high mountains, start with two points and run an initial calculation.",
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
            "Inclinaison de la caméra vers le sol, en degrés depuis l'horizontale": "Downward camera angle in degrees from horizontal",
            "Sur Terre": "On Earth",
            "Retour à Huertahernando": "Back to Huertahernando",
            "Luminosité du globe": "Globe brightness",
            "Vitesse de marche selon la pente": "Walking speed according to slope",
            "Vitesse de survol, en km/h": "Flyover speed, in km/h",
            "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.": "Detailed imagery is temporarily unavailable. You can continue exploring with the overview.",
            "Voir la zone détaillée": "View detailed area",
            "Globe Exodus : clic gauche déplacement, milieu rotation et inclinaison, clic droit rotation et zoom, molette vers le pointeur": "Exodus globe: left click move, middle click rotate and tilt, right click rotate and zoom, wheel zooms toward the pointer",
            "Gauche : déplacer · Milieu : tourner / incliner · Droit : tourner / zoomer · Molette : zoom vers le pointeur. Approche à 1 km.": "Left: move · Middle: rotate / tilt · Right: rotate / zoom · Wheel: zoom toward pointer. Approach to 1 km.",
            "Tuiles : image générale": "Tiles: overview image",
            "Langue :": "Language:",
            "Automatique": "Automatic"
        },
        es: {
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
            "Conseil : en haute montagne, commencez avec deux points et faites un premier calcul.": "Consejo: en alta montaña, empieza con dos puntos y haz un primer cálculo.",
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
            "Inclinaison de la caméra vers le sol, en degrés depuis l'horizontale": "Inclinación de la cámara hacia el suelo, en grados desde la horizontal",
            "Sur Terre": "En la Tierra",
            "Retour à Huertahernando": "Volver a Huertahernando",
            "Luminosité du globe": "Luminosidad del globo",
            "Vitesse de marche selon la pente": "Velocidad de marcha según la pendiente",
            "Vitesse de survol, en km/h": "Velocidad de vuelo, en km/h",
            "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.": "Las imágenes detalladas no están disponibles temporalmente. Puede seguir explorando con la vista general.",
            "Voir la zone détaillée": "Ver zona detallada",
            "Globe Exodus : clic gauche déplacement, milieu rotation et inclinaison, clic droit rotation et zoom, molette vers le pointeur": "Globo Exodus: clic izquierdo mover, clic central girar e inclinar, clic derecho girar y acercar, rueda acerca hacia el puntero",
            "Gauche : déplacer · Milieu : tourner / incliner · Droit : tourner / zoomer · Molette : zoom vers le pointeur. Approche à 1 km.": "Izquierda: mover · Centro: girar / inclinar · Derecha: girar / acercar · Rueda: acercar al puntero. Aproximación a 1 km.",
            "Tuiles : image générale": "Teselas: imagen general",
            "Langue :": "Idioma:",
            "Automatique": "Automático"
        },
        ca: {
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
            "Étape ": "Tram ",
            "Calcul en cours — annuler": "Càlcul en curs — cancel·la",
            "Terminer les points (": "Acaba la selecció de punts (",
            "En attente du point suivant": "Esperant el punt següent",
            "En attente du point suivant. Ajoute un second point pour lancer le calcul.": "Esperant el punt següent. Afegeix un altre punt per iniciar el càlcul.",
            "Calcul en cours…": "Càlcul en curs…",
            "Calcul interrompu. Voir Messages.": "Càlcul interromput. Consulta els missatges.",
            "Calcul annulé. Choisis le premier point.": "Càlcul cancel·lat. Tria el primer punt.",
            "Sur Terre": "A la Terra",
            "Retour à Huertahernando": "Torna a Huertahernando",
            "Luminosité du globe": "Brillantor del globus",
            "Vitesse de marche selon la pente": "Velocitat de caminada segons el pendent",
            "Vitesse de survol, en km/h": "Velocitat del sobrevol, en km/h",
            "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.": "Les imatges detallades no estan disponibles temporalment. Podeu continuar explorant amb la vista general.",
            "Voir la zone détaillée": "Mostra la zona detallada",
            "Globe Exodus : clic gauche déplacement, milieu rotation et inclinaison, clic droit rotation et zoom, molette vers le pointeur": "Globus Exodus: clic esquerre per moure, central per girar i inclinar, dret per girar i apropar, roda per apropar cap al punter",
            "Gauche : déplacer · Milieu : tourner / incliner · Droit : tourner / zoomer · Molette : zoom vers le pointeur. Approche à 1 km.": "Esquerre: moure · Central: girar / inclinar · Dret: girar / apropar · Roda: apropar cap al punter. Aproximació a 1 km.",
            "Tuiles : image générale": "Rajoles: imatge general",
            "Langue :": "Llengua:",
            "Automatique": "Automàtic"
        }
    };

    var placeSearchTranslations = [
        ["Clique sur « Choisir plusieurs points » pour commencer un trajet.", "Click ‘Choose multiple points’ to start a route.", "Pulsa « Elegir varios puntos » para comenzar una ruta.", "Prem « Tria diversos punts » per començar una ruta."],
        ["Google Earth — pivot", "Google Earth — pivot", "Google Earth — punto de giro", "Google Earth — pivot"],
        ["Définis un pivot avec le clic milieu ou droit", "Set a pivot with the middle or right mouse button", "Define un punto de giro con el botón central o derecho del ratón", "Defineix un pivot amb el botó central o dret del ratolí"],
        ["Ouvrir Google Earth à la position du dernier pivot", "Open Google Earth at the last pivot position", "Abrir Google Earth en la posición del último punto de giro", "Obre Google Earth a la posició de l’últim pivot"],
        ["Pente de référence du trajet, de 5 à 12 degrés", "Reference route slope, from 5 to 12 degrees", "Pendiente de referencia de la ruta, de 5 a 12 grados", "Pendent de referència de la ruta, de 5 a 12 graus"],
        ["Plafond de pente accepté du trajet, de 5 à 70 degrés", "Maximum allowed route slope, from 5 to 70 degrees", "Límite de pendiente de la ruta, de 5 a 70 grados", "Límit de pendent de la ruta, de 5 a 70 graus"],
        ["Temps maximal de calcul par option, en secondes", "Maximum calculation time per option, in seconds", "Tiempo máximo de cálculo por opción, en segundos", "Temps màxim de càlcul per opció, en segons"],
        ["Hauteur de caméra au-dessus du trajet, en mètres", "Camera height above route, in metres", "Altura de la cámara sobre la ruta, en metros", "Altura de la càmera sobre la ruta, en metres"],
        ["Impossible d’entrer dans le simulateur.", "Unable to enter the simulator.", "No se puede entrar en el simulador.", "No es pot entrar al simulador."],
        ["Préparation du calcul…", "Preparing calculation…", "Preparando el cálculo…", "Preparant el càlcul…"],
        ["Préparation impossible. Voir Messages.", "Unable to prepare calculation. See Messages.", "No se pudo preparar el cálculo. Consulta los mensajes.", "No s’ha pogut preparar el càlcul. Consulta els missatges."],
        ["Points choisis. Relance le bouton pour calculer.", "Points selected. Press the button again to calculate.", "Puntos seleccionados. Pulsa el botón de nuevo para calcular.", "Punts seleccionats. Prem el botó de nou per calcular."],
        ["Calcul de l’étape ", "Calculating leg ", "Calculando el tramo ", "Calculant el tram "],
        ["Langue", "Language", "Idioma", "Llengua"],
        ["Ouvrir Google Earth au départ et télécharger le tracé", "Open Google Earth at the start and download the route", "Abrir Google Earth en la salida y descargar la ruta", "Obre Google Earth a la sortida i descarrega la ruta"],
        ["Tuiles : ", "Tiles: ", "Teselas: ", "Rajoles: "],
        [" affichées", " displayed", " visibles", " visibles"],
        ["niveau EOX ", "EOX level ", "nivel EOX ", "nivell EOX "],
        [" en chargement", " loading", " cargando", " carregant"],
        ["mémoire ", "cache ", "memoria ", "memòria "],
        ["vue générale", "overview", "vista general", "vista general"],
        ["image générale conservée sur les zones indisponibles", "overview retained in unavailable areas", "vista general conservada en las zonas no disponibles", "vista general conservada a les zones no disponibles"],
        [" min par option", " min per option", " min por opción", " min per opció"],
        [" s par option", " s per option", " s por opción", " s per opció"],
        ["Pente de référence", "Reference slope", "Pendiente de referencia", "Pendent de referència"],
        ["Pente maximale acceptée", "Maximum allowed slope", "Pendiente máxima permitida", "Pendent màxim permès"],
        ["Temps par option", "Time per option", "Tiempo por opción", "Temps per opció"],
        ["Messages du calcul", "Calculation messages", "Mensajes del cálculo", "Missatges del càlcul"],
        ["Messages du calcul Marcheur", "Walker calculation messages", "Mensajes del cálculo del caminante", "Missatges del càlcul del caminant"],
        ["Fermer", "Close", "Cerrar", "Tanca"],
        ["Calques des trajets", "Route layers", "Capas de rutas", "Capes de rutes"],
        ["Hauteur au-dessus du trajet", "Height above route", "Altura sobre la ruta", "Altura sobre la ruta"],
        ["Vitesse de survol", "Flyover speed", "Velocidad de vuelo", "Velocitat del sobrevol"],
        ["Inclinaison vers le sol", "Downward camera angle", "Inclinación hacia el suelo", "Inclinació cap al terra"],
        ["Entrer dans le simulateur de marche", "Enter walking simulator", "Entrar en el simulador de marcha", "Entra al simulador de caminada"],
        ["Démarrer le marcheur", "Start walker", "Iniciar el caminante", "Inicia el caminant"],
        ["Pause", "Pause", "Pausa", "Pausa"],
        ["Reprendre", "Resume", "Reanudar", "Reprèn"],
        ["Quitter", "Exit", "Salir", "Surt"],
        ["Choisir plusieurs points", "Choose multiple points", "Elegir varios puntos", "Tria diversos punts"],
        ["Rechoisir plusieurs points", "Choose points again", "Volver a elegir puntos", "Torna a triar punts"],
        ["Refaire le calcul", "Recalculate", "Recalcular", "Torna a calcular"],
        ["Calculer le trajet", "Calculate route", "Calcular la ruta", "Calcula la ruta"],
        ["Temps écoulé : —", "Elapsed time: —", "Tiempo transcurrido: —", "Temps transcorregut: —"],
        ["Temps écoulé : ", "Elapsed time: ", "Tiempo transcurrido: ", "Temps transcorregut: "],
        ["Calcule un trajet pour lancer le survol.", "Calculate a route to start the flyover.", "Calcula una ruta para iniciar el vuelo.", "Calcula una ruta per iniciar el sobrevol."],
        ["Prêt. Choisis deux points sur la carte.", "Ready. Choose two points on the map.", "Listo. Elige dos puntos en el mapa.", "Preparat. Tria dos punts al mapa."],
        ["Prêt. Choisis les points du trajet dans l’ordre.", "Ready. Choose route points in order.", "Listo. Elige los puntos de la ruta en orden.", "Preparat. Tria els punts de la ruta en ordre."],
        ["Simulateur quitté. La vue précédente est restaurée.", "Simulator closed. The previous view has been restored.", "Has salido del simulador. Se ha restaurado la vista anterior.", "Has sortit del simulador. S’ha restaurat la vista anterior."],
        ["Terminer les points (", "Finish selecting points (", "Terminar selección de puntos (", "Acaba la selecció de punts ("],
        ["Clique les points successifs du trajet, puis relance ce bouton pour calculer.", "Click the route points in order, then press this button again to calculate.", "Marca los puntos de la ruta en orden y pulsa este botón de nuevo para calcular.", "Marca els punts de la ruta en ordre i prem aquest botó de nou per calcular."],
        ["Point 1 choisi. Clique le point suivant.", "Point 1 selected. Click the next point.", "Punto 1 seleccionado. Haz clic en el siguiente punto.", "Punt 1 seleccionat. Fes clic al punt següent."],
        [" choisi. Continue dans l’ordre, puis relance ce bouton pour calculer.", " selected. Continue in order, then press this button again to calculate.", " seleccionado. Continúa en orden y pulsa este botón de nuevo para calcular.", " seleccionat. Continua en ordre i prem aquest botó de nou per calcular."],
        ["Crédits", "Credits", "Créditos", "Crèdits"],
        ["Crédits du projet", "Project credits", "Créditos del proyecto", "Crèdits del projecte"],
        ["Description", "Description", "Descripción", "Descripció"],
        ["Marche selon la pente : —", "Walking time by slope: —", "Tiempo de marcha según la pendiente: —", "Caminada segons el pendent: —"],
        ["Marche selon la pente : ", "Walking time by slope: ", "Tiempo de marcha según la pendiente: ", "Caminada segons el pendent: "],
        ["Aimantation des points proches", "Merge nearby points", "Unir puntos cercanos", "Uneix els punts propers"],
        ["Lissage spline final", "Final curve smoothing", "Suavizado final de la curva", "Suavitzat final de la corba"],
        ["Correction globale de vitesse", "Overall speed adjustment", "Ajuste global de velocidad", "Ajust de velocitat global"],
        ["Marcheur lisse", "Smoothed walker route", "Ruta suavizada", "Ruta suavitzada"],
        ["Marcheur aimanté", "Merged walker route", "Ruta con puntos unidos", "Ruta amb punts units"],
        ["Simulateur en marche.", "Simulator running.", "Simulador en marcha.", "Simulador en marxa."],
        ["Simulateur prêt au départ. Règle les curseurs, puis démarre.", "Simulator ready. Adjust the sliders, then start.", "Simulador listo. Ajusta los controles y empieza.", "Simulador preparat. Ajusta els controls i comença."],
        ["Arrivée. Tu peux encore orienter la caméra, ou quitter le simulateur.", "Arrived. You can still turn the camera or exit the simulator.", "Has llegado. Puedes orientar la cámara o salir del simulador.", "Has arribat. Pots orientar la càmera o sortir del simulador."],
        ["En marche", "Walking", "En marcha", "En marxa"],
        ["En pause", "Paused", "En pausa", "En pausa"],
        ["En attente d’un trajet.", "Waiting for a route.", "Esperando una ruta.", "Esperant una ruta."],
        ["Aucun trajet possible", "No route found", "No se ha encontrado una ruta", "No s’ha trobat cap ruta"],
        ["pente trop raide ou zone infranchissable.", "slope too steep or impassable area.", "pendiente demasiado pronunciada o zona infranqueable.", "pendent massa pronunciat o zona infranquejable."],
        ["Le départ ou l'arrivée dépasse la pente maximale praticable.", "The start or finish exceeds the maximum walkable slope.", "La salida o la llegada supera la pendiente máxima permitida.", "La sortida o l’arribada supera el pendent màxim permès."],
        ["Calcul incomplet. Détails dans Messages.", "Calculation incomplete. See Messages for details.", "Cálculo incompleto. Consulta los mensajes.", "Càlcul incomplet. Consulta els missatges."],
        ["Trajet terminé en suivant les ", "Route completed through ", "Ruta completada pasando por los ", "Ruta completada passant pels "],
        [" points.", " points.", " puntos.", " punts."],
        ["Trajet partiel : blocage entre les points ", "Partial route: blocked between points ", "Ruta parcial: bloqueo entre los puntos ", "Ruta parcial: bloqueig entre els punts "],
        [". Voir Messages.", ". See Messages.", ". Consulta los mensajes.", ". Consulta els missatges."],
        ["Google Earth + tracé KML", "Google Earth + KML route", "Google Earth + ruta KML", "Google Earth + ruta KML"],
        ["Module du marcheur indisponible", "Walker unavailable", "Caminante no disponible", "Caminant no disponible"],
        ["Calcule un trajet avant l’export", "Calculate a route before exporting", "Calcula una ruta antes de exportar", "Calcula una ruta abans d’exportar"],
        ["Quitte le simulateur de marche avant de passer sur Terre.", "Exit the walking simulator before switching to Earth.", "Sal del simulador antes de pasar a Tierra.", "Surt del simulador abans de passar a Terra."],
        ["Chargement de Huerta en cours…", "Loading Huerta…", "Cargando Huerta…", "Carregant Huerta…"],
        ["Conseil : en haute montagne, commencez avec deux points et faites un premier calcul.", "Advice: in high mountains, start with two points and run an initial calculation.", "Consejo: en alta montaña, empieza con dos puntos y haz un primer cálculo.", "Consell: a l’alta muntanya, comença amb dos punts i fes un primer càlcul."],
        ["Marcheur en préparation pour ce lieu.", "Walker being prepared for this place.", "Caminante en preparación para este lugar.", "Caminant en preparació per a aquest lloc."],
        ["Chargement du relief…", "Loading terrain heights…", "Cargando el relieve…", "Carregant el relleu…"],
        ["Relief chargé", "Terrain heights loaded", "Relieve cargado", "Relleu carregat"],
        ["Détail variable selon la source", "Detail varies by source", "Detalle variable según la fuente", "Detall variable segons la font"],
        ["Réessayer le relief", "Retry terrain heights", "Reintentar el relieve", "Torna a provar el relleu"],
        ["Relief indisponible près des pôles. La vue reste plane.", "Terrain heights are unavailable near the poles. The view remains flat.", "El relieve no está disponible cerca de los polos. La vista sigue siendo plana.", "El relleu no està disponible prop dels pols. La vista continua plana."],
        ["Relief temporairement indisponible. La vue reste plane.", "Terrain heights are temporarily unavailable. The view remains flat.", "El relieve no está disponible temporalmente. La vista sigue siendo plana.", "El relleu no està disponible temporalment. La vista continua plana."],
        ["Relief : Mapzen Terrain Tiles · sources et crédits", "Terrain: Mapzen Terrain Tiles · sources and credits", "Relieve: Mapzen Terrain Tiles · fuentes y créditos", "Relleu: Mapzen Terrain Tiles · fonts i crèdits"],
        ["Le marcheur sera disponible après la construction du relief.", "The walker will be available once the terrain heights are added.", "El caminante estará disponible después de construir el relieve.", "El caminant estarà disponible després de construir el relleu."],
        ["Choisissez et validez une zone depuis Terre.", "Choose and confirm an area from Earth.", "Elija y valide una zona desde Tierra.", "Trieu i valideu una zona des de Terra."],
        ["Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone.", "Zoom in closely, then move the ground beneath the frame, or search for a place, then confirm this area.", "Acerque mucho la vista y después desplace el terreno bajo el marco, o busque un lugar, y confirme esta zona.", "Apropeu molt la vista i després desplaceu el terreny sota el marc, o cerqueu un lloc, i confirmeu aquesta zona."],
        ["Valider cette zone", "Confirm this area", "Validar esta zona", "Valida aquesta zona"],
        ["Zone choisie", "Selected area", "Zona elegida", "Zona triada"],
        ["Vue locale — relief à construire.", "Local view — terrain heights to be added.", "Vista local — relieve por construir.", "Vista local — relleu per construir."],
        ["Vue locale de la zone choisie", "Local view of the selected area", "Vista local de la zona elegida", "Vista local de la zona triada"],
        ["Images de la zone", "Area images", "Imágenes de la zona", "Imatges de la zona"],
        ["Certaines images sont indisponibles. Revenez sur Terre pour réessayer.", "Some images are unavailable. Return to Earth to try again.", "Algunas imágenes no están disponibles. Vuelva a Tierra para intentarlo de nuevo.", "Algunes imatges no estan disponibles. Torneu a Terra per tornar-ho a provar."],
        ["Retour sur Terre", "Return to Earth", "Volver a Tierra", "Torna a Terra"],
        ["Revenir au lieu choisi", "Return to the selected place", "Volver al lugar elegido", "Torna al lloc triat"],
        ["Gauche : déplacer · Milieu : tourner / incliner · Molette : zoomer.", "Left: pan · Middle: rotate / tilt · Wheel: zoom.", "Izquierdo: desplazar · Central: girar / inclinar · Rueda: zoom.", "Esquerre: desplaçar · Central: girar / inclinar · Roda: zoom."],
        ["Recherchez une commune ou saisissez ses coordonnées GPS.", "Search for a town or enter its GPS coordinates.", "Busque un municipio o introduzca sus coordenadas GPS.", "Cerqueu un municipi o introduïu-ne les coordenades GPS."],
        ["Terre", "Earth", "Tierra", "Terra"],
        ["Choisir un lieu sur Terre", "Choose a place on Earth", "Elegir un lugar en la Tierra", "Trieu un lloc a la Terra"],
        ["Commune ou coordonnées GPS", "Town or GPS coordinates", "Municipio o coordenadas GPS", "Municipi o coordenades GPS"],
        ["Huertahernando, Espagne ou 40.827897, -2.288334", "Huertahernando, Spain or 40.827897, -2.288334", "Huertahernando, España o 40.827897, -2.288334", "Huertahernando, Espanya o 40.827897, -2.288334"],
        ["Rechercher", "Search", "Buscar", "Cerca"],
        ["GPS : latitude, longitude en degrés décimaux.", "GPS: latitude, longitude in decimal degrees.", "GPS: latitud, longitud en grados decimales.", "GPS: latitud, longitud en graus decimals."],
        ["Lieux trouvés", "Places found", "Lugares encontrados", "Llocs trobats"],
        ["Lieu choisi :", "Selected place:", "Lugar elegido:", "Lloc triat:"],
        ["Le repère indique le lieu choisi sur le globe.", "The marker shows the selected place on the globe.", "El marcador indica el lugar elegido en el globo.", "El marcador indica el lloc triat al globus."],
        ["Choisissez un lieu dans la liste.", "Choose a place from the list.", "Elija un lugar de la lista.", "Trieu un lloc de la llista."],
        ["Aucun lieu trouvé. Précisez la région ou le pays, ou saisissez des coordonnées GPS.", "No place found. Specify a region or country, or enter GPS coordinates.", "No se ha encontrado ningún lugar. Indique la región o el país, o introduzca coordenadas GPS.", "No s'ha trobat cap lloc. Indiqueu la regió o el país, o introduïu coordenades GPS."],
        ["Saisissez une commune ou des coordonnées GPS.", "Enter a town or GPS coordinates.", "Introduzca un municipio o coordenadas GPS.", "Introduïu un municipi o coordenades GPS."],
        ["Coordonnées invalides : latitude de −90 à 90, longitude de −180 à 180.", "Invalid coordinates: latitude from −90 to 90, longitude from −180 to 180.", "Coordenadas no válidas: latitud de −90 a 90, longitud de −180 a 180.", "Coordenades no vàlides: latitud de −90 a 90, longitud de −180 a 180."],
        ["Patientez un instant avant une nouvelle recherche.", "Wait a moment before searching again.", "Espere un momento antes de volver a buscar.", "Espereu un moment abans de tornar a cercar."],
        ["Recherche du lieu…", "Searching for the place…", "Buscando el lugar…", "Cercant el lloc…"],
        ["La recherche par nom est temporairement indisponible. Réessayez ou saisissez des coordonnées GPS.", "Place name search is temporarily unavailable. Try again or enter GPS coordinates.", "La búsqueda por nombre no está disponible temporalmente. Inténtelo de nuevo o introduzca coordenadas GPS.", "La cerca per nom no està disponible temporalment. Torneu-ho a provar o introduïu coordenades GPS."]
    ];
    placeSearchTranslations.forEach(function(row) {
        ["en", "es", "ca"].forEach(function(code, i) { dictionaries[code][row[0]] = row[i + 1]; });
    });

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

    function replaceTerms(value, pairs) {
        var replacements = new Map(pairs.filter(function(pair) { return pair[0]; }));
        var terms = Array.from(replacements.keys()).sort(function(a, b) { return b.length - a.length; });
        if (!terms.length) return value;
        var pattern = new RegExp(terms.map(function(term) {
            return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }).join("|"), "gu");
        return value.replace(pattern, function(match, offset) {
            // Do not replace short labels inside words: Spanish "Ver" must
            // never alter "Version" when returning to French or Catalan.
            var letter = /\p{L}/u;
            if ((letter.test(match[0]) && offset > 0 && letter.test(value[offset - 1])) ||
                (letter.test(match[match.length - 1]) && letter.test(value[offset + match.length] || ""))) return match;
            return replacements.get(match);
        });
    }

    function setActiveLanguage(nextLanguage) {
        if (language === nextLanguage) return;
        var reverse = Object.keys(dictionary).map(function(source) {
            return [dictionary[source], source];
        }).sort(function(a, b) { return b[0].length - a[0].length; });

        function restoreNode(node) {
            if (node.nodeType === 3) {
                var original = node.nodeValue;
                original = replaceTerms(original, reverse);
                node.nodeValue = original;
            } else if (node.nodeType === 1) {
                ["title", "placeholder", "aria-label"].forEach(function(attribute) {
                    if (!node.hasAttribute(attribute)) return;
                    var value = node.getAttribute(attribute);
                    value = replaceTerms(value, reverse);
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
        document.querySelectorAll('input[name="huerta_language"]').forEach(function(radio) {
            radio.checked = radio.value === language;
        });
        // The selected terrain lives in a separate document. Both language
        // menus must control the same language, including an already open zone.
        if (window.parent !== window && window.parent.HuertaI18n) {
            window.parent.HuertaI18n.setLanguage(language);
        }
        var localFrame = document.getElementById("exodus_local_frame");
        if (localFrame && localFrame.contentWindow.HuertaI18n) {
            localFrame.contentWindow.HuertaI18n.setLanguage(language);
        }
    }

    function translate(value) {
        if (Object.prototype.hasOwnProperty.call(dictionary, value)) return dictionary[value];
        return replaceTerms(value, Object.keys(dictionary).map(function(source) { return [source, dictionary[source]]; }));
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
