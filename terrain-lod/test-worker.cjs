const fs=require('node:fs'),fsp=require('node:fs/promises'),vm=require('node:vm'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const G=require('./geometry.js'),manifest=JSON.parse(fs.readFileSync('assets/marcheur_tiles/manifest.json'));
const waiting=new Map();let sequence=0,concurrent=0,maxConcurrent=0;
const box={performance,Response,DecompressionStream,console,
    fetch:async url=>{
        concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);
        try {const bytes=await fsp.readFile(path.resolve('terrain-lod',url));return new Response(bytes);}
        finally {concurrent--;}
    },postMessage:message=>{
        const p=waiting.get(message.id);waiting.delete(message.id);
        message.error?p.reject(Error(message.error)):p.resolve(message.result);
    }};
box.self=box;const context=vm.createContext(box);
context.importScripts=file=>vm.runInContext(fs.readFileSync(path.join('terrain-lod',file),'utf8'),context);
vm.runInContext(fs.readFileSync('terrain-lod/worker.js','utf8'),context);
function request(data) {return new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});box.onmessage({data:{id,...data}});});}
const source=new Map(),index=new Map(manifest.tiles.map(t=>[t.row+','+t.col,t]));
function sample(x,y) {
    if(x<0||y<0||x>=manifest.width||y>=manifest.height)return NaN;
    const r=Math.floor(y/256),c=Math.floor(x/256),key=r+','+c;
    if(!source.has(key)) {const tile=index.get(key);source.set(key,{tile,bytes:zlib.gunzipSync(fs.readFileSync('assets/marcheur_tiles/'+tile.elevationFile))});}
    const {tile,bytes}=source.get(key);return bytes.readFloatLE(((y%256)*tile.width+x%256)*4);
}
(async()=>{
    await request({type:'init',manifest});let cases=0;
    for(const row of [0,5,10,17])for(const col of [0,5,10,18]) {
        const result=await request({type:'build',row,col,step:16});
        const reference=G.build(row,col,16,sample,manifest,{mask:true});
        assert.deepEqual(Array.from(result.g.positions),Array.from(reference.positions));
        assert.deepEqual(Array.from(result.g.indices),Array.from(reference.indices));
        assert(result.cacheTiles<=32);assert(result.cacheBytes<=32*256*256*4);
        assert(Array.from(result.g.normals).every(Number.isFinite));cases++;
    }
    const transition=await request({type:'build',row:7,col:8,step:1,previous:16});
    assert.equal(transition.morph.length,transition.g.positions.length);
    assert.deepEqual(Array.from(transition.g.positions),Array.from(G.build(7,8,1,sample,manifest).positions));
    assert.equal((await request({type:'clear'})).cleared,true);
    assert(maxConcurrent<=4&&maxConcurrent>1,'bounded parallel requests');
    console.log('Worker:',cases,'edge/interior cases, LRU eviction, exact source geometry, finite normals, transition buffers and clear passed; peak parallel reads',maxConcurrent);
})().catch(e=>{console.error(e);process.exitCode=1;});
