const assert=require('node:assert/strict'),G=require('./geometry.js');
const m={tileCells:256,width:257,height:257,cellSizeX:2,cellSizeY:2,xMin:559563,yMax:4519538};
for(const step of [1,4,16])for(const masked of [false,true]) {
    const g=G.build(0,0,step,(x,y)=>masked&&x===0&&y>100&&y<110?NaN:1000+x*.1+y*.2,m,{mask:true});
    g.normals=new Float32Array(g.positions.length);for(let i=2;i<g.normals.length;i+=3)g.normals[i]=1;
    const morph=g.positions.slice(),result=G.skirts(g,morph,1,-1);
    assert.deepEqual(result.g.positions.subarray(0,g.positions.length),g.positions,'exact original surface positions');
    assert.deepEqual(result.g.indices.subarray(0,g.indices.length),g.indices,'exact original surface triangles');
    assert.equal(result.g.positions.length,result.morph.length,'morph matches skirt topology');
    assert.equal(result.g.positions.length,result.g.normals.length);
    assert.equal(result.g.positions.length/3,result.g.uvs.length/2);
    for(let i=g.indices.length;i<result.g.indices.length;i+=6) {
        const [a,b,c]=result.g.indices.subarray(i,i+3),p=result.g.positions;
        assert(Math.hypot(p[a*3]-p[b*3],p[a*3+1]-p[b*3+1])<=2.00001,'never bridge a missing border sample');
        const low=[c,result.g.indices[i+5]].find(id=>id>=g.positions.length/3);
        assert(low!==undefined);assert(p[low*3+2]<=Math.max(p[a*3+2],p[b*3+2])-63.9);
    }
    assert(result.g.indices.every(i=>i<result.g.positions.length/3));
}
console.log('Overview joins: exact unchanged surface, native border segments, NoData gaps, buffers and morph topology passed (6 cases).');
