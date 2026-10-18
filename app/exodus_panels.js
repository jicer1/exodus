/* Screen-space layout only. The walker and simulator keep their existing controls. */
(function() {
    "use strict";
    var rail, queued=false, panels=new Map(), observed=new Set();
    var resizeObserver=typeof ResizeObserver!=="undefined"?new ResizeObserver(schedule):null;
    function t(value){return window.HuertaI18n?HuertaI18n.t(value):value;}
    function visible(node){return node&&node.getClientRects().length>0;}
    function narrow(){return window.matchMedia("(max-width:760px)").matches;}
    function schedule(){if(!queued){queued=true;requestAnimationFrame(function(){queued=false;layout();});}}
    function collapseLayers(){
        var layer=document.getElementById("huerta_calques");
        if(layer&&layer.children[0]&&layer.children[0].getAttribute("aria-expanded")==="true")layer.children[0].click();
    }
    function closeOtherPanels(current){
        if(!narrow())return;
        panels.forEach(function(control,node){if(node!==current)control.setExpanded(false);});
        if(!current||current.id!=="huerta_calques")collapseLayers();
    }
    function installPanel(node){
        if(!node||panels.has(node)||!node.firstElementChild)return;
        var title=node.firstElementChild;
        var body=document.createElement("div");body.className="exodus-panel-body";body.id=node.id+"_content";
        while(node.firstChild)body.appendChild(node.firstChild);
        var button=document.createElement("button");button.type="button";button.className="exodus-panel-toggle";
        button.setAttribute("aria-controls",body.id);button.appendChild(title);
        var arrow=document.createElement("span");arrow.setAttribute("aria-hidden","true");button.appendChild(arrow);
        node.appendChild(button);node.appendChild(body);node.classList.add("exodus-rail-panel");
        function setExpanded(expanded){
            body.hidden=!expanded;button.setAttribute("aria-expanded",String(expanded));
            button.title=t(expanded?"Réduire le panneau":"Rouvrir le panneau");
            arrow.textContent=expanded?"▾":"▸";node.classList.toggle("exodus-panel-collapsed",!expanded);schedule();
        }
        button.addEventListener("click",function(){var expand=body.hidden;if(expand)closeOtherPanels(node);setExpanded(expand);});
        panels.set(node,{setExpanded:setExpanded,button:button});setExpanded(true);rail.appendChild(node);
        node.addEventListener("wheel",function(e){e.stopPropagation();},{passive:true});
    }
    function layout(){
        if(!rail)return;
        installPanel(document.getElementById("huerta_marcheur"));
        installPanel(document.getElementById("exodus_free_walk_panel"));
        installPanel(document.getElementById("huerta_marcheur_flight"));
        var freeWalk=document.getElementById("exodus_free_walk_panel"),flight=document.getElementById("huerta_marcheur_flight");
        if(freeWalk && flight && freeWalk.parentNode===rail && flight.parentNode===rail && freeWalk.nextElementSibling!==flight)
            rail.insertBefore(freeWalk,flight);
        var layers=document.getElementById("huerta_calques");
        if(layers){
            if(narrow()&&layers.parentElement!==rail){layers.classList.add("exodus-rail-panel");rail.appendChild(layers);}
            if(!narrow()&&layers.parentElement===rail){layers.classList.remove("exodus-rail-panel");document.body.appendChild(layers);}
            if(!layers.dataset.exodusLayout){
                layers.dataset.exodusLayout="true";
                layers.firstElementChild.addEventListener("click",function(){if(this.getAttribute("aria-expanded")==="true")closeOtherPanels(layers);schedule();});
                layers.addEventListener("wheel",function(e){e.stopPropagation();},{passive:true});
            }
        }
        var credit=document.querySelector(".huerta-credit"), command=document.getElementById("huerta_command_bar"),world=document.getElementById("exodus_world_controls");
        var picker=document.getElementById("huerta_language_picker"),menu=document.getElementById("huerta_menu"),compass=document.getElementById("huerta_compass");
        [credit,command,world,picker,menu].forEach(function(node){if(node&&resizeObserver&&!observed.has(node)){observed.add(node);resizeObserver.observe(node);}});
        if(visible(credit)&&visible(command)){
            var creditLeft=credit.getBoundingClientRect().left,commandLeft=command.getBoundingClientRect().left;
            credit.style.maxWidth=Math.max(60,commandLeft-creditLeft-12)+"px";
        }
        var footerTop=window.innerHeight-12;
        [credit,command].forEach(function(node){if(visible(node))footerTop=Math.min(footerTop,node.getBoundingClientRect().top-10);});
        var protectedBottom=footerTop;
        if(visible(world))protectedBottom=Math.min(protectedBottom,world.getBoundingClientRect().top-10);
        var top=56;
        if(visible(picker))top=Math.max(top,picker.getBoundingClientRect().bottom+8);
        if(narrow())[menu,compass].forEach(function(node){if(visible(node))top=Math.max(top,node.getBoundingClientRect().bottom+8);});
        rail.style.top=top+"px";rail.style.bottom=Math.max(12,window.innerHeight-(narrow()?protectedBottom:footerTop))+"px";
        if(layers&&!narrow())layers.style.maxHeight=Math.max(44,protectedBottom-layers.getBoundingClientRect().top)+"px";
        [document.getElementById("huerta_fossil_card"),document.getElementById("exodus_geology_legend")].forEach(function(dialog){
            if(!visible(dialog))return;
            var bounds=dialog.getBoundingClientRect(),dialogTop=Math.max(10,Math.min(bounds.top,protectedBottom-120));
            if(bounds.top!==dialogTop)dialog.style.top=dialogTop+"px";
            dialog.style.maxHeight=Math.max(80,protectedBottom-dialogTop)+"px";
        });
    }
    function start(){
        if(document.getElementById("exodus_left_panels"))return;
        rail=document.createElement("div");rail.id="exodus_left_panels";document.body.appendChild(rail);
        document.body.classList.add("exodus-panels-ready");
        new MutationObserver(schedule).observe(document.body,{childList:true});
        new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["class"]});
        window.addEventListener("resize",schedule);
        window.addEventListener("huerta-language-changed",function(){panels.forEach(function(c){c.button.title=t(c.button.getAttribute("aria-expanded")==="true"?"Réduire le panneau":"Rouvrir le panneau");});schedule();});
        window.addEventListener("exodus-dialog-open",function(e){
            var fossil=document.getElementById("huerta_fossil_card"),geology=document.getElementById("exodus_geology_legend");
            if(fossil&&e.detail!==fossil.id)fossil.hidden=true;
            if(geology&&e.detail!==geology.id)geology.style.display="none";
            closeOtherPanels(null);schedule();
        });
        layout();
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
