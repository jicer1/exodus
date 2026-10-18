"use strict";

// Secteurs de recherche documentés, séparés des calques éditables et de la carte géologique.
HuertaRuntime.register("huerta_fossiles", function(exports, require) {
    var m_geometry=require("geometry"),
        m_material=require("material"), m_navigation=require("huerta_webgl_main"),
        m_objects=require("objects"), m_physics=require("physics"), m_scenes=require("scenes");
    var X0=559563, Y0=4519538, COLLISION="TERRAIN_NAV_MASQUE";
    // Annotations kept visibly above the relief and the geological map.
    var LINE_LIFT=8;
    var data=null, enabled=false, generation=0, lines=[], list=null, card=null, cardBody=null, cardTitle=null, toggle=null;
    var colors={2:[1,.67,.13,1],3:[.38,.73,1,1]};
    function el(tag,parent,css){var node=document.createElement(tag);if(css)node.style.cssText=css;if(parent)parent.appendChild(node);return node;}
    function textLine(parent,title,value){var row=el("div",parent,"margin:4px 0;line-height:1.35;");var strong=el("strong",row);strong.textContent=title+" ";row.appendChild(document.createTextNode(value));}
    function rings(geom){if(geom.type==="Polygon")return [geom.coordinates[0]];if(geom.type==="MultiPolygon")return geom.coordinates.map(function(poly){return poly[0];});return [];}
    function zoneBounds(zone){return zone.properties.bbox_utm;}
    function center(zone){var b=zoneBounds(zone);m_navigation.go_to_world((b[0]+b[2])/2-X0,(b[1]+b[3])/2-Y0,Math.max(350,b[2]-b[0],b[3]-b[1]));}
    function showCard(zone){
        cardBody.textContent="";var p=zone.properties;
        cardTitle.textContent=p.name;
        textLine(cardBody,"Priorité :",String(p.priority)+" — "+(p.priority===2?"prometteur":"à vérifier"));
        textLine(cardBody,"Pourquoi :",p.why);
        textLine(cardBody,"À observer :",p.fossils);
        textLine(cardBody,"Fiabilité :",p.uncertainty);
        textLine(cardBody,"Accès :",p.access);
        textLine(cardBody,"Position :","Repère de zone indicatif en EPSG:25830 : "+p.label_utm.join(", ")+". Ce n'est pas un point de découverte.");
        var sources=el("div",cardBody,"margin-top:6px;");
        [["Étude scientifique",p.source_study],["Carte IGME",p.source_geology]].forEach(function(item,i){
            if(i)sources.appendChild(document.createTextNode(" · "));
            var a=el("a",sources,"color:#bfeaff;");a.textContent=item[0];a.href=item[1];a.target="_blank";a.rel="noopener noreferrer";
        });
        card.hidden=false;
        window.dispatchEvent(new CustomEvent("exodus-dialog-open",{detail:card.id}));
        card.querySelector("button").focus({preventScroll:true});
    }
    function clearLines(){generation++;lines.forEach(function(line){try{m_scenes.change_visibility(line,true);}catch(e){}});}
    function sampled(ring){
        var output=[];
        for(var i=0;i<ring.length;i++){
            var a=ring[i], b=ring[i+1];output.push([a[0]-X0,a[1]-Y0]);
            if(!b)continue;
            var count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/50);
            for(var j=1;j<count;j++){var t=j/count;output.push([a[0]+(b[0]-a[0])*t-X0,a[1]+(b[1]-a[1])*t-Y0]);}
        }
        return output;
    }
    function drawRing(ring,priority,index,ticket){
        var points=sampled(ring), positions=new Float32Array(points.length*3),pending=points.length;
        if(points.length<2)return;
        var line=lines[index];
        if(!line){line=m_objects.create_line("huerta_fossil_zone_"+index);m_material.set_line_params(line,{color:colors[priority]||colors[3],width:4});lines[index]=line;}
        var at=0;
        function nextBatch(){
            if(ticket!==generation||!enabled)return;
            var end=Math.min(at+24,points.length);
            for(;at<end;at++)(function(n){
                var point=points[n];positions[n*3]=point[0];positions[n*3+1]=point[1];
                var ray=m_physics.append_ray_test_ext(null,[point[0],point[1],10000],[point[0],point[1],-10000],COLLISION,
                    function(id,f,obj,time,hit){if(ticket!==generation)return;positions[n*3+2]=hit?Number(hit[2])+LINE_LIFT:LINE_LIFT;if(--pending===0){m_geometry.draw_line(line,positions,false);m_scenes.change_visibility(line,false);}},true,false,true);
                if(!ray){positions[n*3+2]=LINE_LIFT;if(--pending===0){m_geometry.draw_line(line,positions,false);m_scenes.change_visibility(line,false);}}
            })(at);
            if(at<points.length)setTimeout(nextBatch,0);
        }
        nextBatch();
    }
    function draw(){
        clearLines();if(!enabled||!data)return;var ticket=generation,index=0;
        data.features.forEach(function(zone){rings(zone.geometry).forEach(function(ring){drawRing(ring,zone.properties.priority,index++,ticket);});});
    }
    function showList(){
        list.textContent="";data.features.forEach(function(zone){var row=el("button",list,"display:block;width:100%;margin:3px 0;padding:4px;text-align:left;cursor:pointer;");row.type="button";row.textContent="P"+zone.properties.priority+" · "+zone.properties.name;row.addEventListener("click",function(){if(!enabled){enabled=true;toggle.checked=true;draw();}showCard(zone);center(zone);});});
    }
    function init(){
        var content=document.querySelector("#huerta_calques > div:last-child");if(!content){setTimeout(init,100);return;}
        var section=el("section",content,"margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.3);max-width:330px;");section.id="huerta_fossiles";
        var label=el("label",section,"display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:bold;");toggle=el("input",label);toggle.type="checkbox";el("span",label).textContent="Zones de recherche de fossiles";
        var note=el("div",section,"font-size:11px;opacity:.8;margin:3px 0 5px;");note.textContent="Huertahernando uniquement · contours indicatifs, pas des gisements confirmés.";
        list=el("div",section,"display:none;");
        card=el("section",document.body);card.id="huerta_fossil_card";card.className="exodus-floating-card";
        card.setAttribute("role","dialog");card.setAttribute("aria-label","Fiche de zone fossile");card.hidden=true;
        var cardHead=el("div",card);cardHead.className="exodus-floating-card__head";
        cardTitle=el("h3",cardHead);
        var closeCard=el("button",cardHead);closeCard.type="button";closeCard.textContent="×";closeCard.setAttribute("aria-label","Fermer");
        closeCard.addEventListener("click",function(){card.hidden=true;});
        cardBody=el("div",card);cardBody.className="exodus-floating-card__body";
        card.addEventListener("wheel",function(e){e.stopPropagation();},{passive:true});
        document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!card.hidden){card.hidden=true;e.stopPropagation();}});
        toggle.addEventListener("change",function(){enabled=toggle.checked;list.style.display=enabled?"block":"none";if(!enabled)card.hidden=true;draw();},false);
        fetch("assets/fossiles_huertahernando.json?local=1",{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error("Fossil data unavailable");return r.json();}).then(function(value){data=value;showList();}).catch(function(){note.textContent="Zones de fossiles indisponibles.";toggle.disabled=true;});
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,false);else init();
});
HuertaRuntime.require("huerta_fossiles");
