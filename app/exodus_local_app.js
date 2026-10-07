"use strict";

// The selected area runs the SAME Huerta runtime, interface and mouse handlers
// in an isolated document. No Huerta meshes, routes or camera state are replaced.
window.ExodusLocalContext=window.frameElement?.exodusZoneContext;
(() => {
    const context=window.ExodusLocalContext;
    let terrainView;
    const t=value=>window.HuertaI18n?.t ? window.HuertaI18n.t(value) : value;
    if(!context) {
        document.addEventListener("DOMContentLoaded",()=>{
            document.getElementById("migration_loading").textContent=t("Choisissez et validez une zone depuis Terre.");
        });
        return;
    }
    window.HuertaSceneLoader=async function(scene,url,progress) {
        terrainView=ExodusZone.createTerrainView(context.zone,scene);
        const material=new BABYLON.ShaderMaterial("Local image source",scene,context.shaderPath,context.shaderOptions);
        terrainView.open(context.zone,material); material.dispose();
        terrainView.setActive(context.active);
        await terrainView.waitForTerrain();
        progress?.(100);
        HuertaMigration.worldMode=context.active ? "huerta" : "earth";
        return terrainView.getResult();
    };
    window.ExodusLocalApp={dispose() {
        HuertaRuntime.require("huerta_marcheur").dispose();
        terrainView?.setActive(false);
        HuertaMigration.engine?.dispose();
    }, setActive(value) {
        context.active=value;
        HuertaMigration.worldMode=value ? "huerta" : "earth";
        terrainView?.setActive(value);
    }};
    HuertaRuntime.register("huerta_calques", exports=>{exports.set_simulator_hidden=()=>{};});
    HuertaRuntime.register("huerta_campos", exports=>{exports.set_simulator_hidden=()=>{};});
    window.addEventListener("load",()=>{
        document.body.className=parent.document.body.className.replace(/exodus-on-(earth|local)/g,"").trim();
        HuertaI18n.setLanguage(parent.HuertaI18n.language);
        const hud=document.querySelector("#huerta_hud strong");
        if(hud)hud.textContent=context.zone.name;
        // Show all original panels. Data belonging specifically to Huerta is
        // kept unavailable here until there are layers/heights for this area.
        for(const id of ["huerta_calques","huerta_campos_layer"]) {
            const original=parent.document.getElementById(id);
            if(original) {
                const copy=original.cloneNode(true);
                copy.querySelectorAll("button,input,select").forEach(control=>{control.disabled=true;if(control.type==="checkbox")control.checked=false;});
                document.body.appendChild(copy);
            }
        }
        const walkerControls=[];
        for(const id of ["huerta_marcheur","huerta_marcheur_flight"]) {
            const panel=document.getElementById(id);
            if(!panel)continue;
            panel.querySelectorAll("button,input,select").forEach(control=>{
                walkerControls.push({control,disabled:control.disabled});control.disabled=true;
            });
            panel.title=t("Marcheur en préparation pour ce lieu.");
            const status=document.getElementById(id === "huerta_marcheur" ? "huerta_marcheur_pick_status" : "huerta_marcheur_flight_status");
            if(status)status.textContent=t("Marcheur en préparation pour ce lieu.");
        }
        function connectWalker() {
            if(!context.routing)return;
            walkerControls.forEach(({control,disabled})=>{control.disabled=disabled;});
            document.getElementById("huerta_marcheur").title="";
            document.getElementById("huerta_marcheur_flight").title="";
            document.getElementById("huerta_marcheur_pick_status").textContent=t("Clique sur « Choisir plusieurs points » pour commencer un trajet.");
            document.getElementById("huerta_marcheur_flight_status").textContent=t("Calcule un trajet pour lancer le survol.");
        }
        window.addEventListener("exodus-terrain-ready",connectWalker,{once:true});
        connectWalker();
        const credit=parent.document.querySelector(".huerta-credit").cloneNode(true);
        credit.querySelector(".huerta-credit__data")?.remove();
        credit.querySelector(".exodus-image-credit").style.display="block";
        const heightCredit=document.createElement("div");heightCredit.className="exodus-image-credit";
        const link=document.createElement("a");link.href="assets/earth-height/ATTRIBUTION.md";link.target="_blank";link.rel="noopener";
        link.textContent=t("Relief : Mapzen Terrain Tiles · sources et crédits");heightCredit.appendChild(link);credit.appendChild(heightCredit);
        document.body.appendChild(credit);
        window.HuertaCredits?.init(credit);
        const panel=document.getElementById("exodus_local_panel");
        if(panel)panel.classList.add("exodus-local-info");
    });
})();
