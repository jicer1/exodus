const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const {build}=require('./geometry.js');
const manifest=JSON.parse(fs.readFileSync('assets/marcheur_tiles/manifest.json'));
const cache=new Map();
function sample(x,y) {
    const row=Math.floor(y/256),col=Math.floor(x/256),key=row+','+col;
    if(!cache.has(key)) {
        const tile=manifest.tiles.find(t=>t.row===row&&t.col===col);
        const bytes=zlib.gunzipSync(fs.readFileSync('assets/marcheur_tiles/'+tile.elevationFile));
        cache.set(key,{tile,bytes});
    }
    const {tile,bytes}=cache.get(key);return bytes.readFloatLE(((y%256)*tile.width+x%256)*4);
}
function boundary(g,axis,value) {
    const result=[];
    for(let i=0;i<g.positions.length;i+=3) if(g.positions[i+axis]===value) result.push(Array.from(g.positions.slice(i,i+3)));
    return result.sort((a,b)=>a[axis===0?1:0]-b[axis===0?1:0]);
}
const results=[];
for(const step of [1,2,4,8,16]) {
    const a=build(7,8,step,sample,manifest);
    for(let i=0;i<a.positions.length;i+=3) {
        const x=Math.round((a.positions[i]+559563-manifest.xMin)/2-.5);
        const y=Math.round((manifest.yMax-a.positions[i+1]-4519538)/2-.5);
        assert.equal(a.positions[i+2],sample(x,y));
    }
    const edges=new Map();let area=0;
    for(let i=0;i<a.indices.length;i+=3) {
        const ids=Array.from(a.indices.slice(i,i+3));
        const [p,q,r]=ids.map(id=>a.positions.slice(id*3,id*3+3));
        const cross=(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
        assert(cross>0,'positive non-degenerate orientation');area+=cross/2;
        for(let n=0;n<3;n++) {const key=[ids[n],ids[(n+1)%3]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
    }
    assert.equal(area,512*512,'no missing or overlapping surface area');
    assert.equal([...edges.values()].filter(n=>n===1).length,1024,'only the four native boundaries are open');
    assert([...edges.values()].every(n=>n===1||n===2),'manifold mesh');
    for(const other of [1,2,4,8,16]) {
        const b=build(7,9,other,sample,manifest),c=build(8,8,other,sample,manifest);
        const east=manifest.xMin+(9*256+.5)*2-559563;
        const south=manifest.yMax-(8*256+.5)*2-4519538;
        assert.deepEqual(boundary(a,0,east),boundary(b,0,east));
        assert.deepEqual(boundary(a,1,south),boundary(c,1,south));
    }
    results.push({stepMeters:step*2,vertices:a.positions.length/3,triangles:a.indices.length/3,
        geometryBytes:a.positions.byteLength*2+a.uvs.byteLength+a.indices.byteLength});
}
assert.throws(()=>build(7,8,3,sample,manifest));
assert.throws(()=>build(7,8,1,()=>NaN,manifest));
fs.writeFileSync('terrain-lod/geometry-results.json',JSON.stringify({tests:'Native DEM heights, manifold topology, winding, area and both seams for all 25 LOD pairs passed',results},null,2));
console.log(JSON.stringify(results,null,2));
