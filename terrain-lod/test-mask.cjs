const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const G=require('./geometry.js'),m=JSON.parse(fs.readFileSync('assets/marcheur_tiles/manifest.json'));
const cache=new Map(),index=new Map(m.tiles.map(t=>[t.row+','+t.col,t]));
function sample(x,y) {
    if(x<0||y<0||x>=m.width||y>=m.height)return NaN;
    const r=Math.floor(y/256),c=Math.floor(x/256),key=r+','+c;
    if(!cache.has(key)) {const t=index.get(key);const b=zlib.gunzipSync(fs.readFileSync('assets/marcheur_tiles/'+t.elevationFile));cache.set(key,{t,b});}
    const {t,b}=cache.get(key);return b.readFloatLE(((y%256)*t.width+x%256)*4);
}
let totalTriangles=0,tiles=0,totalArea=0;
for(const tile of m.tiles) {
    const g=G.build(tile.row,tile.col,16,sample,m,{mask:true});
    if(g.indices.length)tiles++;
    let area=0,nativeArea=0;
    for(let i=0;i<g.indices.length;i+=3) {
        const p=Array.from(g.indices.slice(i,i+3),id=>g.positions.slice(id*3,id*3+3));
        const cross=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
        assert(cross>0);area+=cross/2;assert(p.every(v=>v.every(Number.isFinite)));
    }
    for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
        const gx=tile.col*256+x,gy=tile.row*256+y;
        const a=sample(gx,gy),b=sample(gx+1,gy),c=sample(gx+1,gy+1),d=sample(gx,gy+1);
        if([a,c,b].every(Number.isFinite))nativeArea+=2;
        if([a,d,c].every(Number.isFinite))nativeArea+=2;
    }
    assert.equal(area,nativeArea,'mask must retain exact native triangle footprint: '+tile.row+','+tile.col);
    totalTriangles+=g.indices.length/3;totalArea+=area;
    // Bound test memory too; all neighbouring tiles can be reread as needed.
    if(cache.size>24)cache.clear();
}
const report={tilesWithGeometry:tiles,trianglesAt32m:totalTriangles,areaSquareMeters:totalArea,
    tests:'All 342 tiles: finite vertices, positive triangle areas, exact equality with the native valid-triangle footprint (including the isolated missing pixel and partial edge tiles)'};
fs.writeFileSync('terrain-lod/mask-results.json',JSON.stringify(report,null,2));console.log(report);
