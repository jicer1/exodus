const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const G=require('./geometry.js'),m=JSON.parse(fs.readFileSync('assets/marcheur_tiles/manifest.json'));
const cache=new Map();
function sample(x,y) {
    const r=Math.floor(y/256),c=Math.floor(x/256),key=r+','+c;
    if(!cache.has(key)) {const t=m.tiles.find(t=>t.row===r&&t.col===c);const b=zlib.gunzipSync(fs.readFileSync('assets/marcheur_tiles/'+t.elevationFile));cache.set(key,{t,b});}
    const {t,b}=cache.get(key);return b.readFloatLE(((y%256)*t.width+x%256)*4);
}
let maxError=0;
const fine=G.build(7,8,1,sample,m);
for(const step of [2,4,8,16]) {
    const coarse=G.build(7,8,step,sample,m),field=G.surface(coarse,7,8,m);
    assert(field.every(Number.isFinite),'coarse triangles cover the entire native lattice');
    const projected=G.project(fine,field,7,8,m);
    for(let i=0;i<fine.positions.length;i+=3) {
        assert.equal(projected[i],fine.positions[i]);assert.equal(projected[i+1],fine.positions[i+1]);
        const x=Math.round((fine.positions[i]+559563-m.xMin)/2-.5)-8*256;
        const y=Math.round((m.yMax-fine.positions[i+1]-4519538)/2-.5)-7*256;
        if(x===0||x===256||y===0||y===256)assert.equal(projected[i+2],fine.positions[i+2],'borders must not move during morph');
        maxError=Math.max(maxError,Math.abs(projected[i+2]-fine.positions[i+2]));
    }
    const back=G.project(coarse,G.surface(fine,7,8,m),7,8,m);
    assert.deepEqual(back,coarse.positions,'the same DEM samples are recovered after a full round trip');
}
console.log('Morph: exact triangle projection, native borders fixed, no XY shift, endpoint round trip passed; largest 32m approximation difference:',maxError.toFixed(3),'m');
