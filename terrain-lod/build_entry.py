"""Build the development entry from the shared legacy markup, without editing it."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
s = (root / 'index.html').read_text(encoding='utf-8')
s = s.replace('<title>Exodus — Sur Terre</title>', '<title>EXODUS 2.0.1 — Développement LOD</title>')
s = s.replace('<script src="scene-loader.js"></script>', '<script src="scene-loader.js"></script>\n<script src="terrain-lod/integration.js?v=2.0.1"></script>')
s = s.replace('2026 — Version 1.0.15', '2026 — Version 2.0.1 · Développement')
s = s.replace('<script src="verify.js"></script>', '<script src="terrain-lod/ravine-preview.js"></script>\n<script src="terrain-lod/verify-panorama.js"></script>\n<script src="terrain-lod/verify-lod.js"></script>')
(root / 'index-lod.html').write_text(s, encoding='utf-8')
checks = (root / 'verify.js').read_text(encoding='utf-8')
checks = checks.replace('assert("All exported vertices retained",vertices===1403945,vertices);',
    'assert("Original 1.0.15 base and navigation retained; redundant HD geometry released",vertices===720017 && collision.getTotalVertices()===65536 && state.loaded.objects.get(HuertaConfig.terrain).getTotalVertices()===654481,vertices);\n'
    '            assert("Navigation buffers no longer retain the complete legacy export",[collision.getVerticesData(BABYLON.VertexBuffer.PositionKind),collision.getIndices()].every(a=>!ArrayBuffer.isView(a)||a.buffer.byteLength===a.byteLength));\n'
    '            assert("LOD initialized",ExodusTerrainLOD.ready && ExodusTerrainLOD.errors.length===0);\n'
    '            assert("Original base ready without initial geometry requests",ExodusTerrainLOD.displayMode==="base-1.0.15" && ExodusTerrainLOD.buildRequests===0 && ExodusTerrainLOD.cacheTiles===0);\n'
    '            assert("Bounded LOD geometry and DEM cache",ExodusTerrainLOD.geometryBytes<=ExodusTerrainLOD.budgetBytes && ExodusTerrainLOD.cacheTiles<=32);')
checks = checks.replace('state.scene.textures.length===1 && state.scene.textures[0]===baseTexture',
    'state.scene.textures.filter(t=>/\\/hd_tiles\\//.test(t.url || "")).length===0')
checks = checks.replace('"HD textures released after zooming out"','"HD image textures released after zooming out"')
checks = checks.replace('assert("HD tiles load near camera",hd.length>0,hd.length);',
    'assert("HD tiles load near camera",hd.length>0,hd.length);\n'
    '            for(let n=0;n<120 && ExodusTerrainLOD.displayMode!=="detail";n++) await wait(100);\n'
    '            assert("Near terrain reaches detailed mode",ExodusTerrainLOD.displayMode==="detail",ExodusTerrainLOD.displayMode);\n'
    '            assert("Shared HD imagery is bound separately for visible geometry tiles",ExodusTerrainLOD.shaderBoundTiles>1 && ExodusTerrainLOD.tilesUsingHD>0,'
    '{bound:ExodusTerrainLOD.shaderBoundTiles,usingHD:ExodusTerrainLOD.tilesUsingHD});\n'
    '            await ExodusVerifyPanorama({state,api,nav,cam,mouse,cx,cy,wait,assert,ray});\n'
    '            const beforeWheelOut=ExodusTerrainLOD.buildRequests;\n'
    '            state.canvas.dispatchEvent(new WheelEvent("wheel",{bubbles:true,cancelable:true,deltaY:120,clientX:state.canvas.getBoundingClientRect().left+cx,clientY:state.canvas.getBoundingClientRect().top+cy}));\n'
    '            await wait(100);\n'
    '            assert("Backward wheel immediately restores original base",ExodusTerrainLOD.displayMode==="base-1.0.15" && state.loaded.objects.get(HuertaConfig.terrain).isVisible);\n'
    '            await wait(900);\n'
    '            assert("Backward wheel triggers no new tile build",ExodusTerrainLOD.buildRequests===beforeWheelOut && ExodusTerrainLOD.buildRequestsDuringRetreat===0,'
    '{before:beforeWheelOut,after:ExodusTerrainLOD.buildRequests});')
checks = checks.replace('nav.go_to_initial_view(); await wait(1000);',
    'const beforeZoomOut=ExodusTerrainLOD.buildRequests;\n'
    '            nav.go_to_initial_view(); await wait(100);\n'
    '            assert("Zoom-out immediately uses original terrain",ExodusTerrainLOD.displayMode==="base-1.0.15" && state.loaded.objects.get(HuertaConfig.terrain).isVisible);\n'
    '            await wait(1200);\n'
    '            assert("Zoom-out sends no geometry construction request",ExodusTerrainLOD.buildRequests===beforeZoomOut && ExodusTerrainLOD.buildRequestsDuringRetreat===0,'
    '{before:beforeZoomOut,after:ExodusTerrainLOD.buildRequests,duringRetreat:ExodusTerrainLOD.buildRequestsDuringRetreat});\n'
    '            await wait(2200);\n'
    '            for(let n=0;n<20 && (ExodusTerrainLOD.tiles || ExodusTerrainLOD.cacheTiles);n++) await wait(100);\n'
    '            assert("Unused detail and DEM cache released after zoom-out",ExodusTerrainLOD.tiles===0 && ExodusTerrainLOD.cacheTiles===0 && ExodusTerrainLOD.geometryBytes===ExodusTerrainLOD.baseGeometryBytes);')
checks = checks.replace('{expected:1,after:state.scene.textures.length}',
    '{remainingHD:state.scene.textures.filter(t=>/\\/hd_tiles\\//.test(t.url || "")).length,totalIncludingTemporaryMorph:state.scene.textures.length}')
checks = checks.replace('assert("No runtime errors",state.errors.length===0,state.errors);',
    'const imagery=HuertaRuntime.require("huerta_hd_tiles");\n'
    '            for(const mode of ["historic1956color","topographic","geology","pnoa2021"]) {\n'
    '                const ok=await new Promise(resolve=>imagery.set_imagery(mode,resolve));\n'
    '                assert("Imagery switch "+mode,ok && imagery.get_imagery()===mode && state.loaded.objects.get(HuertaConfig.terrain).material.diffuseTexture.isReady());\n'
    '            }\n'
    '            assert("No runtime errors",state.errors.length===0,state.errors);')
checks = checks.replace('assert("No runtime errors",state.errors.length===0,state.errors);',
    'assert("No runtime errors",state.errors.length===0,state.errors);\n'
    '            assert("No LOD errors",ExodusTerrainLOD.errors.length===0,ExodusTerrainLOD.errors);\n'
    '            assert("LOD statistics",ExodusTerrainLOD.geometryBytes<=ExodusTerrainLOD.budgetBytes,'
    '{tiles:ExodusTerrainLOD.tiles,triangles:ExodusTerrainLOD.triangles,geometryBytes:ExodusTerrainLOD.geometryBytes,'
    'cacheBytes:ExodusTerrainLOD.cacheBytes,cacheTiles:ExodusTerrainLOD.cacheTiles,maxUploadMs:ExodusTerrainLOD.maxUploadMs,'
    'maxFrameMs:ExodusTerrainLOD.maxFrameMs,fps:state.engine.getFps()});')
(root / 'terrain-lod' / 'verify-lod.js').write_text(checks, encoding='utf-8')
for variant, markup in [('legacy', (root / 'index.html').read_text(encoding='utf-8')), ('lod', s)]:
    markup = markup.replace('</head>', '<script src="terrain-lod/benchmark.js"></script>\n</head>')
    (root / ('benchmark-' + variant + '.html')).write_text(markup, encoding='utf-8')
