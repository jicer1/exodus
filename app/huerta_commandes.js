(function() {
    "use strict";

    function createCommandBar() {
        if (!document.body || document.getElementById("huerta_command_bar"))
            return;

        document.body.classList.add("huerta-calques-off", "huerta-test-off");

        var bar = document.createElement("form");
        bar.id = "huerta_command_bar";
        bar.setAttribute("role", "group");
        bar.setAttribute("aria-label", "Commandes d’affichage Huerta");

        var input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", "Commande d’affichage");
        input.placeholder = "Commande : off calque / on calque / off test / on test";

        var button = document.createElement("button");
        button.type = "submit";
        button.textContent = "OK";
        button.setAttribute("aria-label", "Exécuter la commande");

        var message = document.createElement("span");
        message.id = "huerta_command_status";
        message.setAttribute("role", "status");
        message.setAttribute("aria-live", "polite");

        bar.appendChild(input);
        bar.appendChild(button);
        bar.appendChild(message);
        document.body.appendChild(bar);

        bar.addEventListener("submit", function(event) {
            event.preventDefault();
            var command = input.value.trim().toLowerCase().replace(/\s+/g, " ");
            var result = "";

            if (command === "off calque") {
                document.body.classList.add("huerta-calques-off");
                result = "Panneaux des calques masqués.";
            } else if (command === "on calque") {
                document.body.classList.remove("huerta-calques-off");
                result = "Panneaux des calques visibles.";
            } else if (command === "off test") {
                document.body.classList.add("huerta-test-off");
                result = "Panneaux de test masqués.";
            } else if (command === "on test") {
                document.body.classList.remove("huerta-test-off");
                result = "Panneaux de test visibles. Les calques gardent leur réglage séparé.";
            } else {
                result = "Commande inconnue. Essaie on/off calque ou on/off test.";
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
