"use strict";

// Editeur de calques simple : un outil agit sur le calque sélectionné.
HuertaRuntime.register("huerta_layer_studio", function(exports, require) {
var m_camera=require("camera"),m_geometry=require("geometry"),m_hud=require("huerta_hud"),m_main=require("main"),m_material=require("material"),m_navigation=require("huerta_webgl_main"),m_objects=require("objects"),m_physics=require("physics"),m_scenes=require("scenes"),m_calques=require("huerta_calques");
var COLLISION_ID="TERRAIN_NAV_MASQUE",layers=[],selectedLayer=-1,selectedObject=-1,tool="select",action=null,draft=null,saveAvailable=false,markerEntries=[],lineObjects=[],heightCache=new Map(),drawGeneration=0;
var panel,layerList,objectList,objectSection,status,saveButton,finishButton,undoButton,toolButtons={};

function t(v){return window.HuertaI18n?HuertaI18n.t(v):v;}
function button(parent,label,fn,cls){var b=document.createElement("button");b.type="button";b.textContent=t(label);if(cls)b.className=cls;b.addEventListener("click",fn,false);parent.appendChild(b);return b;}
function setStatus(v){if(status)status.textContent=t(v);}
function currentLayer(){return selectedLayer>=0?layers[selectedLayer]:null;}
function objectPoints(o){return o.type==="marker"?[o]:o.points;}

function setTool(next){
    tool=next;action=null;draft=null;
    Object.keys(toolButtons).forEach(function(name){toolButtons[name].classList.toggle("is-active",name===tool);toolButtons[name].setAttribute("aria-pressed",String(name===tool));});
    if(tool==="select")setStatus("Sélectionne un objet dans la liste.");
    if(tool==="marker")setStatus("Clique sur le terrain pour ajouter un repère.");
    if(tool==="line")setStatus("Clique sur le terrain pour commencer une ligne.");
    updateButtons();renderAll();
}

function uniqueLayerName(){var n=1,names=layers.map(function(l){return l.name;});while(names.indexOf("Calque "+n)>=0)n++;return "Calque "+n;}
function createLayer(){layers.forEach(function(layer){layer.visible=false;});layers.push({name:uniqueLayerName(),visible:true,system:false,objects:[]});selectedLayer=layers.length-1;selectedObject=-1;refresh();renderAll();setStatus("Nouveau calque créé et sélectionné.");}

function renameInline(row,value,commit){
    var input=document.createElement("input"),done=false;input.type="text";input.value=value;input.maxLength=120;input.style.cssText="flex:1;min-width:75px;padding:2px;";row.insertBefore(input,row.firstChild);input.focus();input.select();
    function finish(save){if(done)return;done=true;var next=input.value.trim();if(save&&next)commit(next);refresh();}
    input.addEventListener("keydown",function(e){if(e.key==="Enter")finish(true);if(e.key==="Escape")finish(false);},false);input.addEventListener("blur",function(){finish(true);},false);
}

function focusPoints(points){
    if(!points||!points.length)return;var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    points.forEach(function(p){var xy=m_calques.gps_to_world(p.lat,p.lon);minX=Math.min(minX,xy[0]);maxX=Math.max(maxX,xy[0]);minY=Math.min(minY,xy[1]);maxY=Math.max(maxY,xy[1]);});
    m_navigation.go_to_world((minX+maxX)/2,(minY+maxY)/2,Math.max(120,maxX-minX,maxY-minY));
}

function refreshLayers(){
    layerList.textContent="";
    layers.forEach(function(layer,index){
        var row=document.createElement("div");row.className="huerta-layer-studio__row"+(index===selectedLayer?" is-selected":"");
        var visible=document.createElement("input");visible.type="checkbox";visible.checked=layer.visible;visible.setAttribute("aria-label",t(layer.name));visible.title=t("Afficher ou masquer le calque");visible.addEventListener("change",function(){layer.visible=visible.checked;refresh();renderAll();},false);row.appendChild(visible);
        button(row,layer.name,function(){
            if(!document.body.classList.contains("huerta-edit-on")){
                layer.visible=true;refresh();renderAll();focusPoints(layer.objects.reduce(function(all,o){return all.concat(objectPoints(o));},[]));return;
            }
            if(index===selectedLayer){
                selectedLayer=-1;selectedObject=-1;action=null;draft=null;refresh();renderAll();setStatus("Aucun calque sélectionné.");return;
            }
            if(document.body.classList.contains("huerta-edit-on")){
                layers.forEach(function(other){other.visible=false;});
                layer.visible=true;
            }
            selectedLayer=index;selectedObject=-1;action=null;draft=null;refresh();renderAll();setStatus("Calque sélectionné : "+layer.name);
        },"huerta-layer-studio__name").title=t("Sélectionner ce calque");
        if(!document.body.classList.contains("huerta-edit-on")){
            button(row,"Voir",function(){layer.visible=true;refresh();renderAll();focusPoints(layer.objects.reduce(function(all,o){return all.concat(objectPoints(o));},[]));});
        } else if(layer.system){var badge=document.createElement("span");badge.textContent=t("Base");badge.style.cssText="font-size:9px;opacity:.65;";row.appendChild(badge);}
        else{
            button(row,"Renommer",function(){renameInline(row,layer.name,function(v){layer.name=v;});});
            button(row,"×",function(){if(!window.confirm(t("Supprimer ce calque et tous ses objets ?")))return;layers.splice(index,1);selectedLayer=Math.min(selectedLayer,layers.length-1);selectedObject=-1;refresh();renderAll();setStatus("Calque supprimé.");}).title=t("Supprimer le calque");
        }
        layerList.appendChild(row);
    });
}

function beginMove(objectIndex,pointIndex){
    selectedObject=objectIndex;setTool("select");
    action=pointIndex<0?{kind:"move-marker",object:objectIndex}:{kind:"move-line-point",object:objectIndex,point:pointIndex};
    setStatus(pointIndex<0?"Clique la nouvelle position du repère.":"Clique la nouvelle position du point.");updateButtons();
}

function refreshObjects(){
    objectList.textContent="";var layer=currentLayer();if(!layer)return;
    layer.objects.forEach(function(object,index){
        var row=document.createElement("div");row.className="huerta-layer-studio__row"+(index===selectedObject?" is-selected":"");
        var icon=document.createElement("span");icon.textContent=object.type==="marker"?"●":"╱";icon.title=t(object.type==="marker"?"Repère":"Ligne");row.appendChild(icon);
        button(row,object.name,function(){selectedObject=index;setTool("select");refresh();focusPoints(objectPoints(object));},"huerta-layer-studio__name").title=t("Sélectionner et centrer");
        if(object.type==="marker")button(row,"Déplacer",function(){beginMove(index,-1);});
        else button(row,"Points",function(){selectedObject=index;setTool("select");refresh();setStatus("Choisis le point à déplacer.");});
        button(row,"Renommer",function(){renameInline(row,object.name,function(v){object.name=v;});});
        button(row,"×",function(){layer.objects.splice(index,1);selectedObject=-1;refresh();renderAll();setStatus("Objet supprimé.");}).title=t("Supprimer");
        objectList.appendChild(row);
        if(object.type==="line"&&selectedObject===index){var points=document.createElement("div");points.style.cssText="display:flex;flex-wrap:wrap;gap:3px;margin:0 0 7px 20px;";object.points.forEach(function(p,pi){button(points,String(pi+1),function(){beginMove(index,pi);}).title=t("Déplacer ce point");});objectList.appendChild(points);}
    });
    if(!layer.objects.length){var empty=document.createElement("div");empty.textContent=t("Ce calque est vide.");empty.style.cssText="font-size:11px;opacity:.7;padding:5px 2px;";objectList.appendChild(empty);}
}

function refresh(){if(!panel)return;refreshLayers();refreshObjects();if(objectSection){var layer=currentLayer();objectSection.style.display=document.body.classList.contains("huerta-edit-on")&&layer&&layer.visible?"block":"none";}updateButtons();}
function updateButtons(){var drawing=!!draft;if(finishButton)finishButton.disabled=!drawing||draft.points.length<2;undoButton.disabled=!drawing||!draft.points.length;saveButton.disabled=!saveAvailable||!!action;}
function finishLine(){var layer=currentLayer();if(!layer||!draft||draft.points.length<2)return;layer.objects.push(draft);selectedObject=layer.objects.length-1;draft=null;action=null;setTool("select");refresh();renderAll();setStatus("Ligne terminée. Enregistre pour la conserver.");}
function cancelAction(){action=null;draft=null;setTool("select");refresh();renderAll();setStatus("Modification annulée.");}

function createPanel(){
    var content=document.querySelector("#huerta_calques > div:last-child");if(!content)return false;document.body.classList.add("huerta-layer-studio-active");
    panel=document.createElement("section");panel.id="huerta_layer_studio";
    var title=document.createElement("div");title.textContent=t("Éditeur de calques");title.style.cssText="font:bold 13px Arial,sans-serif;margin-bottom:6px;";title.classList.add("huerta-layer-studio__edit-only");panel.appendChild(title);
    var tools=document.createElement("div");tools.className="huerta-layer-studio__tools huerta-layer-studio__edit-only";toolButtons.select=button(tools,"Sélection",function(){setTool("select");});toolButtons.marker=button(tools,"Repère",function(){setTool("marker");});toolButtons.line=button(tools,"Ligne",function(){setTool("line");});panel.appendChild(tools);
    var lh=document.createElement("div");lh.className="huerta-layer-studio__section-title huerta-layer-studio__edit-only";var lt=document.createElement("span");lt.textContent=t("Calques");lh.appendChild(lt);button(lh,"+",createLayer).title=t("Créer un calque");panel.appendChild(lh);
    layerList=document.createElement("div");layerList.id="huerta_layer_studio_list";panel.appendChild(layerList);
    objectSection=document.createElement("div");objectSection.id="huerta_layer_studio_object_section";panel.appendChild(objectSection);
    var oh=document.createElement("div");oh.className="huerta-layer-studio__section-title";oh.textContent=t("Objets du calque sélectionné");objectSection.appendChild(oh);objectList=document.createElement("div");objectList.id="huerta_layer_studio_items";objectSection.appendChild(objectList);
    var actions=document.createElement("div");actions.className="huerta-layer-studio__actions";undoButton=button(actions,"Retour",function(){if(draft&&draft.points.length)draft.points.pop();updateButtons();renderAll();});button(actions,"Annuler",cancelAction);objectSection.appendChild(actions);
    saveButton=button(panel,"Enregistrer",save);saveButton.classList.add("huerta-layer-studio__edit-only");status=document.createElement("div");status.classList.add("huerta-layer-studio__edit-only");status.style.cssText="font-size:11px;margin:5px 0;max-width:330px;";panel.appendChild(status);
    var first=document.getElementById("huerta_parideras_editor");content.insertBefore(panel,first||content.firstChild);setTool("select");refresh();return true;
}

function workspaceData(){
    var p=[],m=[],c=[];layers.forEach(function(layer){
        if(layer.id==="parideras")p=layer.objects.filter(function(o){return o.type==="marker";}).map(function(o){return{name:o.name,lat:o.lat,lon:o.lon};});
        if(layer.id==="murs")m=layer.objects.filter(function(o){return o.type==="line";}).map(function(o){return{name:o.name,points:o.points};});
        c.push({id:layer.id||undefined,name:layer.name,objects:layer.objects});
    });return{parideras:p,murs:m,calques:c};
}
function save(){
    var layer=currentLayer();
    if(draft&&layer&&draft.points.length>=2){
        layer.objects.push(draft);selectedObject=layer.objects.length-1;draft=null;action=null;setTool("select");refresh();renderAll();
    }
    fetch("/__huerta_save_workspace__",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(workspaceData())}).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){setStatus("Calques et objets enregistrés.");}).catch(function(){setStatus("Enregistrement impossible sur ce serveur.");});
}

function setLineVisible(line,show){try{m_scenes.change_visibility(line,!show);}catch(e){}}
function lineObject(index){if(!lineObjects[index]){lineObjects[index]=m_objects.create_line("huerta_studio_line_"+index);m_material.set_line_params(lineObjects[index],{color:[0.15,0.82,0.95,1],width:4});}return lineObjects[index];}
function sample(points){var source=points.map(function(p){return m_calques.gps_to_world(p.lat,p.lon);}),result=source.length?[source[0]]:[];for(var s=1;s<source.length;s++){var a=source[s-1],b=source[s],d=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.ceil(d/10));for(var step=1;step<=count;step++){var f=step/count;result.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}}return result;}
function shouldRender(layer){return layer.visible&&layer.id!=="parideras";}

function renderLines(){
    var ticket=++drawGeneration;lineObjects.forEach(function(line){setLineVisible(line,false);});var objects=[];
    layers.forEach(function(layer){if(shouldRender(layer))layer.objects.forEach(function(o){if(o.type==="line")objects.push(o);});});if(draft&&document.body.classList.contains("huerta-edit-on")&&currentLayer()&&currentLayer().visible)objects.push(draft);
    objects.forEach(function(object,index){if(object.points.length<2)return;var points=sample(object.points),positions=new Float32Array(points.length*3),pending=points.length;
        points.forEach(function(point,pi){positions[pi*3]=point[0];positions[pi*3+1]=point[1];var key=Math.round(point[0]*10)+":"+Math.round(point[1]*10);
            function done(z){if(ticket!==drawGeneration)return;positions[pi*3+2]=z;if(--pending===0){var line=lineObject(index);m_geometry.draw_line(line,positions,false);setLineVisible(line,true);}}
            if(heightCache.has(key)){done(heightCache.get(key));return;}var ray=m_physics.append_ray_test_ext(null,[point[0],point[1],10000],[point[0],point[1],-10000],COLLISION_ID,function(id,f,o,time,hit){var z=hit?hit[2]+3.0:3.0;heightCache.set(key,z);done(z);},true,false,true);if(!ray)done(3.0);
        });
    });
}

function rebuildMarkers(){
    var overlay=document.getElementById("huerta_studio_markers");if(!overlay){overlay=document.createElement("div");overlay.id="huerta_studio_markers";overlay.style.cssText="position:fixed;inset:0;z-index:10020;pointer-events:none;overflow:hidden;";document.body.appendChild(overlay);}overlay.textContent="";markerEntries=[];
    layers.forEach(function(layer){if(!shouldRender(layer))return;layer.objects.forEach(function(o){if(o.type!=="marker")return;var xy=m_calques.gps_to_world(o.lat,o.lon),el=document.createElement("div");el.textContent=o.name;el.style.cssText="position:absolute;display:none;transform:translate(-50%,-100%);padding:2px 5px;border:2px solid #fff;border-radius:9px 9px 9px 2px;background:#20a8c7;color:#fff;font:bold 11px Arial;box-shadow:0 1px 4px #000;white-space:nowrap;";overlay.appendChild(el);var entry={element:el,point:new Float32Array([xy[0],xy[1],4]),ready:false};markerEntries.push(entry);var ray=m_physics.append_ray_test_ext(null,[xy[0],xy[1],10000],[xy[0],xy[1],-10000],COLLISION_ID,function(id,f,obj,time,hit){if(hit)entry.point[2]=Number(hit[2])+2;entry.ready=true;},true,false,true);if(!ray)entry.ready=true;});});
}
function renderAll(){
    var parideras=layers.filter(function(layer){return layer.id==="parideras";})[0];
    if(parideras)m_calques.sync_layer(parideras.objects.filter(function(object){return object.type==="marker";}),parideras.visible);
    renderLines();rebuildMarkers();
}
function updateMarkers(){if(!markerEntries.length)return;var cam=m_scenes.get_active_camera(),canvas=document.querySelector("#main_canvas_container canvas");if(!cam||!canvas)return;var rect=canvas.getBoundingClientRect();markerEntries.forEach(function(e){if(!e.ready)return;var p=m_camera.project_point(cam,e.point,new Float32Array(3)),show=p&&p[2]>=0&&p[2]<=1&&p[0]>=0&&p[1]>=0&&p[0]<=rect.width&&p[1]<=rect.height;e.element.style.display=show?"block":"none";if(show){e.element.style.left=(rect.left+p[0])+"px";e.element.style.top=(rect.top+p[1])+"px";}});}

function addAt(gps){
    var layer=currentLayer();if(!layer){setStatus("Crée ou sélectionne d’abord un calque.");return;}
    if(action&&action.kind==="move-marker"){var marker=layer.objects[action.object];if(marker){marker.lat=gps.lat;marker.lon=gps.lon;}action=null;setTool("select");refresh();renderAll();setStatus("Repère déplacé.");return;}
    if(action&&action.kind==="move-line-point"){var line=layer.objects[action.object];if(line&&line.points[action.point])line.points[action.point]={lat:gps.lat,lon:gps.lon};action=null;setTool("select");refresh();renderAll();setStatus("Point déplacé.");return;}
    if(tool==="marker"){layer.objects.push({type:"marker",name:"Repère "+(layer.objects.length+1),lat:gps.lat,lon:gps.lon});selectedObject=layer.objects.length-1;refresh();renderAll();setStatus("Repère ajouté. Clique pour en ajouter un autre.");return;}
    if(tool==="line"){if(!draft)draft={type:"line",name:"Ligne "+(layer.objects.length+1),points:[]};draft.points.push({lat:gps.lat,lon:gps.lon});updateButtons();renderAll();setStatus("Point ajouté. Continue ou termine la ligne.");}
}
function handleClick(event){if(!document.body.classList.contains("huerta-edit-on"))return;if(tool==="select"&&!action)return;if(!event.target||event.target.tagName!=="CANVAS")return;event.stopImmediatePropagation();event.preventDefault();m_navigation.pick_terrain(event.offsetX,event.offsetY,function(hit){if(!hit){setStatus("Position non détectée.");return;}addAt(m_hud.world_to_gps(Number(hit[0]),Number(hit[1])));});}

function normalizeCustom(layer){var normalized;if(Array.isArray(layer.objects))normalized={id:layer.id,name:layer.name,visible:false,system:layer.id==="parideras"||layer.id==="murs",objects:layer.objects};else{var type=layer.type==="lines"?"line":"marker";normalized={name:layer.name,visible:false,system:false,objects:(layer.items||[]).map(function(item){var copy=Object.assign({},item);copy.type=type;return copy;})};}return normalized;}
function load(){fetch("assets/parideras_edit.json?v=layer-tools-20261012",{cache:"no-store"}).then(function(r){return r.ok?r.json():[];}).then(function(data){var p=Array.isArray(data)?data:(data.parideras||[]),m=Array.isArray(data)?[]:(data.murs||[]),c=Array.isArray(data)?[]:(data.calques||[]);layers=c.map(normalizeCustom);if(!layers.some(function(l){return l.id==="parideras";}))layers.unshift({id:"parideras",name:"Parideras",visible:false,system:true,objects:p.map(function(i){return{type:"marker",name:i.name,lat:Number(i.lat),lon:Number(i.lon)};})});if(!layers.some(function(l){return l.id==="murs";}))layers.splice(1,0,{id:"murs",name:"Mur",visible:false,system:true,objects:m.map(function(i){return{type:"line",name:i.name,points:i.points};})});
    var parideras=layers.filter(function(l){return l.id==="parideras";})[0],mur=layers.filter(function(l){return l.id==="murs";})[0];
    if(parideras&&mur){var legacyLines=parideras.objects.filter(function(o){return o.type==="line";});parideras.objects=parideras.objects.filter(function(o){return o.type!=="line";});mur.objects=mur.objects.concat(legacyLines);}
    selectedLayer=-1;selectedObject=-1;refresh();renderAll();setStatus("Sélectionne un calque pour commencer.");}).catch(function(){layers=[];selectedLayer=-1;refresh();});}

function init(){
    if(!createPanel())return;(function attach(tries){var canvas=document.querySelector("#main_canvas_container canvas");if(canvas)canvas.addEventListener("click",handleClick,true);else if(tries>0)setTimeout(function(){attach(tries-1);},100);}(40));
    fetch("/__huerta_health__",{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(info){saveAvailable=!!(info&&info.local_only&&info.storage_version>=2);updateButtons();if(!saveAvailable)setStatus("Enregistrement désactivé sur ce serveur.");}).catch(function(){saveAvailable=false;updateButtons();});
    var wasEdit=document.body.classList.contains("huerta-edit-on");
    new MutationObserver(function(){
        var isEdit=document.body.classList.contains("huerta-edit-on");
        if(isEdit&&!wasEdit){selectedLayer=-1;selectedObject=-1;action=null;draft=null;setStatus("Sélectionne un calque pour commencer.");}
        if(isEdit!==wasEdit)refresh();
        wasEdit=isEdit;
        if(isEdit||document.body.classList.contains("huerta-test-off")){
            var layerPanel=document.getElementById("huerta_calques"),content=layerPanel&&layerPanel.children[1],header=layerPanel&&layerPanel.children[0];
            if(content)content.style.display="block";
            if(header){header.textContent="Calques ▲";header.setAttribute("aria-expanded","true");}
        }
        renderAll();
    }).observe(document.body,{attributes:true,attributeFilter:["class"]});load();m_main.append_loop_cb(updateMarkers);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,false);else init();
});
HuertaRuntime.require("huerta_layer_studio");
