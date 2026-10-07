const fs=require('fs'),vm=require('vm'),assert=require('assert');
const messages=[];
const context=vm.createContext({window:{},self:{postMessage:m=>messages.push(m)},performance,Float32Array,console});
context.importScripts=()=>vm.runInContext(fs.readFileSync('Marcheur_autonome/marcheur_core.js','utf8'),context);
vm.runInContext(fs.readFileSync('app/exodus_routing.js','utf8'),context);
vm.runInContext(fs.readFileSync('Marcheur_autonome/huerta_marcheur_worker.js','utf8'),context);
const create=context.window.ExodusRouting.create;
const zone={width:600,height:600},n=20;
// Deliberately asymmetric south-to-north slope, catches row reversal/offsets.
const heights=Float32Array.from({length:441},(_,i)=>1000+Math.floor(i/21)*3+(i%21));
const routing=create(zone,n,n,heights);
assert.equal(routing.grid.elevations[0],1060);
assert.equal(routing.sample(-300,-300),1000);
assert.equal(routing.sample(300,300),1080);
assert.equal(routing.sample(-285,-285),1002);
async function run(start,end,angle=10,max=angle) {
    messages.length=0;
    await context.self.onmessage({data:{localGrid:routing.grid,start,end,angles:[angle],maximumAngle:max,timeLimitMs:1000}});
    return messages[messages.length-1];
}
(async()=>{
    const start=[-291,-291,routing.sample(-291,-291)],end=[291,291,routing.sample(291,291)];
    const done=await run(start,end);
    assert.equal(done.phase,'done');assert(done.results[0].ok);
    const points=done.results[0].coordinates;
    assert.deepEqual(Array.from(points[0]),start);assert.deepEqual(Array.from(points.at(-1)),end);
    for(const p of points)assert(Math.abs(p[2]-routing.sample(p[0],p[1]))<1e-4);
    assert.equal((await run(start,end,1)).results[0].ok,false);
    assert.equal((await run(start,end,1,10)).results[0].ok,true);
    assert.equal((await run([-301,0,1000],end)).phase,'error');
    assert.equal((await run(start,start)).results[0].coordinates.length,2);
    console.log('Local walker: orientation, mesh heights, precise endpoints, slope limits, progressive search, bounds, same-cell path OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
