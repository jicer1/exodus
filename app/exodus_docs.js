(function () {
    "use strict";
    var cache = {}, dialog, title, subtitle, article, closeButton, current = null, revision = 0;
    var labels = {
        fr: {help:"Aide", about:"À propos de l’exode rural", fiction:"Fiction", close:"Fermer", loading:"Chargement…", error:"Le texte n’a pas pu être chargé."},
        es: {help:"Ayuda", about:"Sobre el éxodo rural", fiction:"Ficción", close:"Cerrar", loading:"Cargando…", error:"No se ha podido cargar el texto."},
        en: {help:"Help", about:"About the rural exodus", fiction:"Fiction", close:"Close", loading:"Loading…", error:"The text could not be loaded."},
        ca: {help:"Ajuda", about:"Sobre l’èxode rural", fiction:"Ficció", close:"Tanca", loading:"Carregant…", error:"No s’ha pogut carregar el text."}
    };
    function language() {var value = window.HuertaI18n && HuertaI18n.language; return labels[value] ? value : "fr";}
    function node(tag, text, className) {var element=document.createElement(tag); if(text)element.textContent=text; if(className)element.className=className; return element;}
    function load(lang) {
        if(!cache[lang]) cache[lang]=fetch("app/docs/"+lang+".json?v=1.0.14-languages-20261016",{cache:"no-cache"}).then(function(response){if(!response.ok)throw new Error("Text unavailable");return response.json();}).catch(function(error){delete cache[lang];throw error;});
        return cache[lang];
    }
    function createDialog() {
        if(dialog)return;
        dialog=node("dialog",null,"exodus-reader"); dialog.id="exodus_reader"; dialog.setAttribute("data-exodus-localized",""); dialog.setAttribute("aria-labelledby","exodus_reader_title");
        var header=node("header",null,"exodus-reader__header"); var heading=node("div"); title=node("h1");title.id="exodus_reader_title";subtitle=node("p",null,"exodus-reader__subtitle");heading.append(title,subtitle);header.appendChild(heading);
        closeButton=node("button");closeButton.type="button";closeButton.addEventListener("click",function(){dialog.close();});header.appendChild(closeButton);dialog.appendChild(header);
        article=node("article",null,"exodus-reader__body");dialog.appendChild(article);document.body.appendChild(dialog);
        dialog.addEventListener("close",function(){current=null;revision++;});
        dialog.addEventListener("click",function(event){if(event.target!==dialog)return;var rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
    }
    function paragraphs(parent, values, fiction) {values.forEach(function(value){parent.appendChild(node("p",value,fiction&&value.indexOf("—")===0?"exodus-reader__dialogue":""));});}
    function render(data, kind) {
        var content=data[kind];title.textContent=content.title;subtitle.textContent=content.subtitle||"";subtitle.hidden=!content.subtitle;article.replaceChildren();article.lang=language();
        if(kind==="help") {
            content.sections.forEach(function(section){article.appendChild(node("h2",section.title));var list=node("dl",null,"exodus-reader__gestures");section.items.forEach(function(item){list.appendChild(node("dt",item[0]));list.appendChild(node("dd",item[1]));});article.appendChild(list);if(section.note)article.appendChild(node("p",section.note,"exodus-reader__note"));});
        } else if(kind==="about") {
            content.sections.forEach(function(section){if(section.title)article.appendChild(node("h2",section.title));paragraphs(article,section.paragraphs,false);});
            var sources=node("footer",null,"exodus-reader__sources");sources.appendChild(node("span",content.sourcesLabel));content.sources.forEach(function(source){var link=node("a",source.title);link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";sources.appendChild(link);});article.appendChild(sources);
        } else {article.classList.add("exodus-reader__story");paragraphs(article,content.paragraphs,true);}
        if(kind!=="fiction")article.classList.remove("exodus-reader__story");article.scrollTop=0;
    }
    function open(kind) {
        createDialog();current=kind;var ticket=++revision,lang=language(),words=labels[lang];dialog.lang=lang;closeButton.textContent=words.close;title.textContent=words[kind];subtitle.hidden=true;article.replaceChildren(node("p",words.loading));
        if(!dialog.open)dialog.showModal();
        load(lang).then(function(data){if(ticket===revision&&current===kind)render(data,kind);}).catch(function(){if(ticket===revision)article.replaceChildren(node("p",words.error));});
    }
    function initializeButtons() {
        var words=labels[language()];document.querySelectorAll(".huerta-credit").forEach(function(credit){
            var actions=credit.querySelector(".exodus-doc-actions");if(!actions){actions=node("span",null,"exodus-doc-actions");actions.setAttribute("data-exodus-localized","");["help","about","fiction"].forEach(function(kind){var button=node("button",words[kind]);button.type="button";button.dataset.document=kind;button.addEventListener("click",function(){open(kind);});actions.appendChild(button);});var details=credit.querySelector(".huerta-credit__details");credit.insertBefore(actions,details||null);}
            actions.querySelectorAll("button").forEach(function(button){button.textContent=words[button.dataset.document];});
        });
    }
    function start(){initializeButtons();new MutationObserver(function(records){if(records.some(function(record){return Array.from(record.addedNodes).some(function(n){return n.nodeType===1&&(n.matches(".huerta-credit")||n.querySelector(".huerta-credit"));});}))initializeButtons();}).observe(document.body,{childList:true,subtree:true});}
    window.addEventListener("huerta-language-changed",function(){initializeButtons();if(current)open(current);});
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
