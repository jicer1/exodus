/* Geometry independent of Babylon: east / north / altitude in EPSG:25830. */
(function(root) {
    'use strict';
    function build(row, col, step, sample, manifest, options={}) {
        if (![1,2,4,8,16].includes(step)) throw Error('Invalid LOD');
        const size = manifest.tileCells, positions=[], uvs=[], indices=[], vertices=new Int32Array((size+1)*(size+1));
        vertices.fill(-1);
        const cells=size/step,partial=new Uint8Array(cells*cells);
        if(options.mask) for(let by=0;by<cells;by++)for(let bx=0;bx<cells;bx++) {
            for(let y=by*step;y<=(by+1)*step&&!partial[by*cells+bx];y++)
                for(let x=bx*step;x<=(bx+1)*step;x++) {
                    const gx=col*size+x,gy=row*size+y;
                    const z=gx<manifest.width&&gy<manifest.height?sample(gx,gy):NaN;
                    if(!Number.isFinite(z)||z < -1000||z>10000) {partial[by*cells+bx]=1;break;}
                }
        }
        const cut=(x,y)=>x>=0&&y>=0&&x<cells&&y<cells&&partial[y*cells+x];
        function vertex(x,y) {
            const key=y*(size+1)+x;
            if(vertices[key]>=0) return vertices[key];
            const gx=col*size+x, gy=row*size+y, z=gx<manifest.width&&gy<manifest.height?sample(gx,gy):NaN;
            if(!Number.isFinite(z)||z < -1000||z>10000) {
                if(options.mask)return -1;throw Error('Invalid DEM elevation');
            }
            const wx=manifest.xMin+(gx+.5)*manifest.cellSizeX-559563;
            const wy=manifest.yMax-(gy+.5)*manifest.cellSizeY-4519538;
            const id=positions.length/3;
            positions.push(wx,wy,z);
            uvs.push((wx+4677)/9354,(wy+4440)/8880);
            vertices[key]=id; return id;
        }
        // The perimeter always uses native 2 m samples, at every LOD.
        // Coarse edge cells are triangulated around a native centre sample.
        // Thus adjacent tiles share exactly the same border segments, without skirts.
        function triangle(a,b,c) {if(a>=0&&b>=0&&c>=0)indices.push(a,b,c);}
        function quad(x,y,w) {
            const a=vertex(x,y),b=vertex(x+w,y),c=vertex(x+w,y+w),d=vertex(x,y+w);
            triangle(a,c,b);triangle(a,d,c);
        }
        for(let y=0;y<size;y+=step) for(let x=0;x<size;x+=step) {
            if(cut(x/step,y/step)) {
                for(let sy=y;sy<y+step;sy++)for(let sx=x;sx<x+step;sx++)quad(sx,sy,1);
                continue;
            }
            const top=y===0||cut(x/step,y/step-1),right=x+step===size||cut(x/step+1,y/step);
            const bottom=y+step===size||cut(x/step,y/step+1),left=x===0||cut(x/step-1,y/step);
            if(step===1 || (!top&&!right&&!bottom&&!left)) {
                quad(x,y,step);continue;
            }
            const border=[];
            for(let t=0;t<step;t+=(top?1:step)) border.push(vertex(x+t,y));
            for(let t=0;t<step;t+=(right?1:step)) border.push(vertex(x+step,y+t));
            for(let t=0;t<step;t+=(bottom?1:step)) border.push(vertex(x+step-t,y+step));
            for(let t=0;t<step;t+=(left?1:step)) border.push(vertex(x,y+step-t));
            const centre=vertex(x+step/2,y+step/2);
            for(let i=0;i<border.length;i++)triangle(centre,border[(i+1)%border.length],border[i]);
        }
        return {positions:new Float32Array(positions),uvs:new Float32Array(uvs),indices:new Uint32Array(indices)};
    }
    function gridPosition(p,i,row,col,m) {
        return [(p[i]+559563-m.xMin)/m.cellSizeX-.5-col*m.tileCells,
            (m.yMax-p[i+1]-4519538)/m.cellSizeY-.5-row*m.tileCells];
    }
    // Reproduce the actual coarse triangles, including the stitched perimeter.
    function surface(g,row,col,m) {
        const stride=m.tileCells+1,field=new Float32Array(stride*stride);field.fill(NaN);
        const p=g.positions;
        for(let i=0;i<g.indices.length;i+=3) {
            const ids=[g.indices[i]*3,g.indices[i+1]*3,g.indices[i+2]*3];
            const [a,b,c]=ids.map(id=>gridPosition(p,id,row,col,m));
            const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
            for(let y=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1])));y<=Math.min(stride-1,Math.floor(Math.max(a[1],b[1],c[1])));y++)
                for(let x=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])));x<=Math.min(stride-1,Math.floor(Math.max(a[0],b[0],c[0])));x++) {
                    const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den;
                    const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,w=1-u-v;
                    if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)field[y*stride+x]=u*p[ids[0]+2]+v*p[ids[1]+2]+w*p[ids[2]+2];
                }
        }
        return field;
    }
    function project(g,field,row,col,m) {
        const result=g.positions.slice(),stride=m.tileCells+1;
        for(let i=0;i<result.length;i+=3) {
            const [x,y]=gridPosition(result,i,row,col,m),z=field[Math.round(y)*stride+Math.round(x)];
            if(Number.isFinite(z))result[i+2]=z;
        }
        return result;
    }
    // Rendering-only curtains close the join to the retained legacy overview.
    // Surface vertices/triangles and DEM samples are unchanged. Only consecutive
    // native samples on the four tile borders are joined (never across NoData).
    function skirts(g,morph,x,y,size=512,depth=64) {
        const edges=[[],[],[],[]],p=g.positions;
        for(let i=0;i<p.length;i+=3) {
            const v=i/3;
            if(p[i]===x)edges[0].push(v);
            if(p[i]===x+size)edges[1].push(v);
            if(p[i+1]===y)edges[2].push(v);
            if(p[i+1]===y-size)edges[3].push(v);
        }
        const boundary=new Set(edges.flat()),segments=new Set();
        for(let i=0;i<g.indices.length;i+=3)for(let n=0;n<3;n++) {
            const a=g.indices[i+n],b=g.indices[i+(n+1)%3];
            if(boundary.has(a)&&boundary.has(b))segments.add(Math.min(a,b)+','+Math.max(a,b));
        }
        const positions=Array.from(p),normals=Array.from(g.normals),uvs=Array.from(g.uvs),indices=Array.from(g.indices),projected=morph?Array.from(morph):null;
        for(let e=0;e<4;e++) {
            const axis=e<2?1:0,edge=edges[e].sort((a,b)=>p[a*3+axis]-p[b*3+axis]);
            for(let n=1;n<edge.length;n++) {
                const a=edge[n-1],b=edge[n];if(Math.abs(p[b*3+axis]-p[a*3+axis]-2)>1e-4)continue;
                if(!segments.has(Math.min(a,b)+','+Math.max(a,b)))continue;
                const c=positions.length/3;
                for(const id of [a,b]) {
                    positions.push(p[id*3],p[id*3+1],p[id*3+2]-depth);
                    normals.push(...g.normals.subarray(id*3,id*3+3));uvs.push(...g.uvs.subarray(id*2,id*2+2));
                    if(projected)projected.push(morph[id*3],morph[id*3+1],morph[id*3+2]-depth);
                }
                if(e===0||e===2)indices.push(a,b,c+1,a,c+1,c);
                else indices.push(b,a,c,b,c,c+1);
            }
        }
        return {g:{positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint32Array(indices)},morph:projected?new Float32Array(projected):null};
    }
    root.ExodusLODGeometry={build,surface,project,skirts};
    if(typeof module!=='undefined') module.exports=root.ExodusLODGeometry;
})(typeof self==='undefined'?globalThis:self);
