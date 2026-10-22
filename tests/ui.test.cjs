/* Execute the shipped UI script against a tiny DOM double.
   This verifies control flow and transport, not rendering, touch or browser layout. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const F=require('../assets/core.js');const D=require('../data/fortunes.json');
async function app(method,hydrate=true){
 const ids=new Map(),events=[],listeners=[];
 class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.hidden=false;this.disabled=false;this.style={};this.dataset={};this._value='';this._text='';this._html='';this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,b)=>{if(b??!this.classes.has(x))this.classes.add(x);else this.classes.delete(x);}};}
  set id(x){this._id=x;ids.set(x,this);}get id(){return this._id;}
  set value(x){this._value=String(x);}get value(){return this._value||this.children.find(x=>x.tagName==='option')?.value||'';}
  set textContent(x){this._text=String(x);this.children=[];}get textContent(){return this._text;}
  set innerHTML(x){this._html=x;this.children=[];for(const m of x.matchAll(/id="([^"]+)"/g)){const e=new Element();e.id=m[1];}}get innerHTML(){return this._html;}
  append(...xs){for(const x of xs){x.parentNode=this;this.children.push(x);}}replaceChildren(...xs){this.children=[];this.append(...xs);}
  addEventListener(type,fn){this['on'+type]=fn;}focus(){}before(){}insertAdjacentHTML(){}remove(){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}
  querySelector(){return this.actor||(this.actor=new Element());}
 }
 for(const id of ['theme','teller','menu-title','menu','play','heading','method-title','intro','era','method-note','error','answer','draw-area','ritual','inputs','scene','cast','choices','result-title','result-text','source-note','again','leave','back']){const e=new Element();e.id=id;}
 const body=new Element('body'),head=new Element('head');
 const parent={postMessage:d=>events.push(d)};
 const ctx={URLSearchParams,Uint32Array,Date,crypto:{getRandomValues:a=>(a[0]=2345678,a)},fetch:async()=>({ok:true,json:async()=>D}),setInterval:()=>1,clearInterval(){},setTimeout,matchMedia:()=>({matches:true}),getComputedStyle:()=>({colorScheme:'light'}),location:{protocol:'http:',search:'?method='+method+'&embed=1'},parent,document:{body,head,createElement:tag=>new Element(tag),getElementById:id=>ids.get(id)},window:{Fortune:F,parent,addEventListener:(type,fn)=>listeners.push(fn)}};
 await vm.runInNewContext(fs.readFileSync('assets/app.js','utf8'),ctx);
 if(hydrate)listeners[0]({source:parent,data:{type:'fortune:state',state:null}});
 return {ids,events,ctx};
}
for(const method of F.METHODS)test(`實際遊戲腳本互動與離席：${method}`,async()=>{
 const {ids,events}=await app(method);const get=id=>ids.get(id);
 assert.equal(get('cast').disabled,false);await get('ritual').onsubmit({preventDefault(){}});
 if(method==='bird')get('draw-area').children[0].onclick();
 if(method==='tarot')for(const b of [...get('draw-area').children[0].children])b.onclick();
 assert.equal(get('answer').hidden,false);assert.notEqual(get('result-title').textContent,'');
 assert.equal(events.filter(e=>e.type==='fortune:save').length,1);
 get('leave').onclick();get('leave').onclick();
 const exits=events.filter(e=>e.type==='fortune:exit');assert.equal(exits.length,1);assert.equal(exits[0].complete,true);assert.equal(exits[0].result.method,method);assert.ok(exits[0].result.id);
});
test('未收到 state 以前不互動；提前離席 complete 為 false',async()=>{
 const {ids,events}=await app('cezi',false);assert.equal(ids.get('cast').disabled,true);await ids.get('ritual').onsubmit({preventDefault(){}});assert.equal(events.filter(e=>e.type==='fortune:save').length,0);ids.get('back').onclick();assert.equal(events.at(-1).complete,false);assert.equal(events.at(-1).result,null);
});
