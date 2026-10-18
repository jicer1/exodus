(function() {
    "use strict";

    function createCommandBar() {
        if (!document.body || document.getElementById("huerta_command_bar"))
            return;

        document.body.classList.add("huerta-calques-off", "huerta-test-off");
        document.body.classList.remove("huerta-edit-on");

        var bar = document.createElement("form");
        bar.id = "huerta_command_bar";
        bar.setAttribute("role", "group");
        bar.setAttribute("aria-label", "Commandes d’affichage Huerta");

        var input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", "Commande d’affichage");
        input.placeholder = "";

        var button = document.createElement("button");
        button.type = "submit";
        button.textContent = "OK";
        button.setAttribute("aria-label", "Exécuter la commande");

        var message = document.createElement("span");
        message.id = "huerta_command_status";
        message.setAttribute("role", "status");
        message.setAttribute("aria-live", "polite");

        bar.appendChild(input);
        bar.appendChild(message);
        document.body.appendChild(bar);

        bar.addEventListener("submit", function(event) {
            event.preventDefault();
            var command = input.value.trim().toLowerCase().replace(/\s+/g, " ");
            var result = "";

            if (command === "edit") {
                document.body.classList.add("huerta-edit-on", "huerta-test-off");
                document.body.classList.remove("huerta-calques-off");
                result = "Mode édition activé.";
            } else if (command === "test") {
                document.body.classList.remove("huerta-test-off", "huerta-edit-on");
                document.body.classList.remove("huerta-calques-off");
                result = "Mode test activé.";
            } else if (command === "normal") {
                document.body.classList.remove("huerta-edit-on");
                document.body.classList.add("huerta-test-off");
                document.body.classList.remove("huerta-calques-off");
                result = "Mode normal activé.";
            } else {
                result = "Commande inconnue. Essaie edit, test ou normal.";
            }

            message.textContent = result;
            input.value = "";
            input.focus();
        });
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", createCommandBar, false);
    else
        createCommandBar();
})();
