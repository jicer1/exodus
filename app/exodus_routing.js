"use strict";
// Routing and rendering share the same samples, in local metres (east, north).
window.ExodusRouting = (() => {
    function create(zone, columns, rows, heights) {
        const dx=zone.width/columns, dy=zone.height/rows, stride=columns+1;
        const elevations=new Float32Array(heights.length);
        for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++)
            elevations[r*stride+c]=heights[(rows-r)*stride+c];
        const grid={width:stride,height:rows+1,cellSizeX:dx,cellSizeY:dy,
            xMin:-zone.width/2-dx/2,yMax:zone.height/2+dy/2,elevations,
            bounds:{west:-zone.width/2,east:zone.width/2,south:-zone.height/2,north:zone.height/2}};
        // Match the two triangles of each rendered cell, including at the edges.
        function sample(x,y) {
            const u=Math.max(0,Math.min(columns,(x+zone.width/2)/dx));
            const v=Math.max(0,Math.min(rows,(y+zone.height/2)/dy));
            const c=Math.min(columns-1,Math.floor(u)),r=Math.min(rows-1,Math.floor(v));
            const a=u-c,b=v-r,i=r*stride+c;
            const sw=heights[i],se=heights[i+1],nw=heights[i+stride],ne=heights[i+stride+1];
            return a+b<=1 ? sw+a*(se-sw)+b*(nw-sw) : ne+(1-a)*(nw-ne)+(1-b)*(se-ne);
        }
        return {grid,sample};
    }
    return {create};
})();
