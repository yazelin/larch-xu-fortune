const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const F=require('../assets/core.js');
function host(method='cezi'){
 const sent=[],toGame=[],handlers=[];const parent={postMessage:d=>sent.push(d)};
 const game={postMessage:(d,origin)=>toGame.push({data:d,origin})};
 const frame={contentWindow:game,hidden:true},waiting={hidden:false};
 const ctx={parent,URL,setTimeout:fn=>fn(),document:{getElementById:id=>id==='game'?frame:waiting},window:{addEventListener:(_,fn)=>handlers.push(fn)}};
 const script=fs.readFileSync('larch/card.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInNewContext(script,ctx);
 const emit=(data,source=game,origin='https://yazelin.github.io')=>handlers[0]({data,source,origin});
 const variables={fortune_cezi_count:3,fortune_cezi_last:'cezi-old'};
 emit({type:'larch:init',variables,values:{method,teller:'市口翁'}},parent,'null');
 return {sent,toGame,emit,frame,parent,game};
}
const copy=x=>JSON.parse(JSON.stringify(x));
for(const m of F.METHODS)test(`真實卡片程式往返：${m}`,()=>{
 const h=host(m);assert.equal(h.sent[0].type,'larch:ready');assert.equal(new URL(h.frame.src).searchParams.get('method'),m);assert.equal(new URL(h.frame.src).searchParams.get('embed'),'1');
 h.emit({type:'fortune:ready'});const state=copy(h.toGame.at(-1).data.state);assert.equal(state.counts.cezi,3);assert.equal(state.last.cezi,'cezi-old');
 assert.equal(h.toGame.at(-1).origin,'https://yazelin.github.io');
 const next=F.record(state,m,m+'-test');h.emit({type:'fortune:save',state:next});h.emit({type:'fortune:save',state:next});
 const sets=h.sent.filter(d=>d.type==='larch:set');assert.equal(sets.length,2);assert.equal(sets[0].name,'fortune_'+m+'_count');assert.equal(sets[0].value,m==='cezi'?4:1);assert.equal(sets[1].value,m+'-test');
 h.emit(F.exitMessage(m,{id:m+'-test'}));h.emit(F.exitMessage(m,{id:m+'-test'}));
 const complete=h.sent.filter(d=>d.type==='larch:complete');assert.equal(complete.length,1);assert.deepEqual(copy(complete[0].payload),{complete:true,result:{method:m,id:m+'-test'}});
});
test('提前離席不加次數、不寫結果',()=>{const h=host();h.emit(F.exitMessage('cezi',null));assert.equal(h.sent.filter(d=>d.type==='larch:set').length,0);assert.equal(h.sent.at(-1).payload.complete,false);});
test('拒絕錯誤來源、偽造結果與非遞增存檔',()=>{
 const h=host();h.emit({type:'fortune:ready'},{});h.emit({type:'fortune:ready'},h.game,'https://attacker.invalid');assert.equal(h.toGame.length,0);
 h.emit({type:'fortune:ready'});const state=copy(h.toGame[0].data.state);const s=F.record(state,'cezi','cezi-test');s.counts.cezi=400;h.emit({type:'fortune:save',state:s});h.emit(F.exitMessage('cezi',{id:'fake'}));assert.equal(h.sent.length,1);
});
test('新一輪初始化保留累積次數、可以再算一次',()=>{
 const h=host();const init={type:'larch:init',variables:{fortune_cezi_count:8,fortune_cezi_last:'cezi-older'},values:{method:'cezi'}};
 h.emit(init,h.parent,'null');h.emit({type:'fortune:ready'});const state=copy(h.toGame.at(-1).data.state);assert.equal(state.counts.cezi,8);
 h.emit({type:'fortune:save',state:F.record(state,'cezi','cezi-new')});h.emit(F.exitMessage('cezi',{id:'cezi-new'}));assert.equal(h.sent.find(d=>d.name==='fortune_cezi_count').value,9);
});
test('固定算法的卡片拒絕另一門的存檔',()=>{const h=host('bird');h.emit({type:'fortune:ready'});const state=copy(h.toGame[0].data.state);h.emit({type:'fortune:save',state:F.record(state,'tarot','tarot-fake')});assert.equal(h.sent.filter(d=>d.type==='larch:set').length,0);});
