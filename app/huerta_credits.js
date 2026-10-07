"use strict";
window.HuertaCredits = (() => {
    function init(credit) {
        if (!credit || credit.dataset.creditsReady === "true") return;
        const toggle = credit.querySelector(".huerta-credit__toggle");
        const details = credit.querySelector(".huerta-credit__details");
        if (!toggle || !details) return;
        credit.dataset.creditsReady = "true";
        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            details.hidden = expanded;
        });
    }
    function initAll(root = document) {
        root.querySelectorAll?.(".huerta-credit").forEach(init);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
    else initAll();
    return {init, initAll};
})();
