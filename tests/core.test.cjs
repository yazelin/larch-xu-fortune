const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const F=require('../assets/core.js');
const D=require('../data/fortunes.json');
// Independent, explicit boundary expectations: do not derive expected values from data.
const boundaries=[
 [1,19,'capricorn'],[1,20,'aquarius'],[2,18,'aquarius'],[2,19,'pisces'],
 [3,20,'pisces'],[3,21,'aries'],[4,19,'aries'],[4,20,'taurus'],
 [5,20,'taurus'],[5,21,'gemini'],[6,21,'gemini'],[6,22,'cancer'],
 [7,22,'cancer'],[7,23,'leo'],[8,22,'leo'],[8,23,'virgo'],
 [9,22,'virgo'],[9,23,'libra'],[10,22,'libra'],[10,23,'scorpio'],
 [11,21,'scorpio'],[11,22,'sagittarius'],[12,21,'sagittarius'],[12,22,'capricorn']
];
for(const [m,d,id]of boundaries)test(`星座邊界 ${m}／${d}`,()=>assert.equal(F.zodiac(m,d,D.zodiac).id,id));
test('星座：閏日、年首尾與無效生日',()=>{
 assert.equal(F.zodiac(2,29,D.zodiac).id,'pisces');assert.equal(F.zodiac(1,1,D.zodiac).id,'capricorn');assert.equal(F.zodiac(12,31,D.zodiac).id,'capricorn');
 for(const pair of [[2,30],[4,31],[0,1],[13,1],[1,0],[1,1.5]])assert.throws(()=>F.zodiac(...pair,D.zodiac));
});
test('測字：字形拆解含續、明、休、林、福',()=>{
 assert.ok(Object.keys(D.cezi.characters).length>=200);
 for(const [c,p]of Object.entries({'續':['糸','賣'],'明':['日','月'],'休':['亻','木'],'林':['木','木'],'福':['礻','畐']}))assert.deepEqual(F.cezi(c,D.cezi).parts,p);
});
test('測字：表外部首、總筆畫與補充平面漢字',()=>{
 const r=F.cezi('龘',D.cezi,'龍',48);assert.equal(r.generic,true);assert.match(r.text,/龍/);assert.match(r.text,/48/);assert.match(r.id,/9f98/);
 assert.equal(F.cezi('𠮷',D.cezi,'口',6).generic,true);
 for(const c of ['', 'ab','林森','A','🙂'])assert.throws(()=>F.cezi(c,D.cezi,'木',8));
 assert.throws(()=>F.cezi('龘',D.cezi));assert.throws(()=>F.cezi('龘',D.cezi,'龍',0));
});
// Published reference values; see tests/SOURCES.md. Do not use the implementation to build expectations.
for(const [y,m,d,gz]of [[1949,10,1,'甲子'],[2000,1,7,'甲子'],[2024,1,1,'甲子'],[2024,1,2,'乙丑'],[2024,2,10,'甲辰']])test(`干支已知日期 ${y}／${m}／${d}`,()=>assert.equal(F.ganzhi(y,m,d),gz));
test('干支：跨日、閏日與無效日期',()=>{assert.equal(F.ganzhi(2000,1,6),'癸亥');assert.equal(F.ganzhi(2024,2,29),'癸亥');assert.equal(F.ganzhi(2024,3,1),'甲子');assert.throws(()=>F.ganzhi(2023,2,29));});
test('日者：沐與學書不誤套到其他事項',()=>{
 assert.equal(F.dayReading(new Date(2024,0,1),'wash',D.day).rule,'washZi');
 assert.equal(F.dayReading(new Date(2024,0,4),'wash',D.day).rule,'washMao');
 assert.equal(F.dayReading(new Date(2024,0,3),'study',D.day).rule,'studyBing');
 for(const a of ['travel','marry','build','official'])assert.equal(F.dayReading(new Date(2024,0,1),a,D.day).rule,'unknown');
 assert.equal(F.dayReading(new Date(2024,0,1),'bury',D.day).rule,'bury');
});
test('鳥卦：固定種子完全可重現，涵蓋三十二箋',()=>{
 const run=seed=>{const r=F.seeded(seed);return Array.from({length:400},()=>F.bird(D.bird,r).id);};
 assert.deepEqual(run('仙泉'),run('仙泉'));assert.notDeepEqual(run('仙泉'),run('續'));assert.equal(new Set(run('仙泉')).size,32);
});
test('塔羅：固定種子、二十二張不重複、正逆皆有',()=>{
 const run=seed=>{const r=F.seeded(seed);return Array.from({length:100},()=>F.tarot(D.tarot,r));};
 const all=run('香布纏');assert.deepEqual(all,run('香布纏'));assert.notDeepEqual(all,run('續'));
 for(const draw of all)assert.equal(new Set(draw.map(c=>c.id)).size,3);
 assert.equal(new Set(all.flat().map(c=>c.id)).size,22);assert.equal(new Set(all.flat().map(c=>c.reversed)).size,2);
});
test('存檔只記次數與代號，不保留名字或生日',()=>{
 const s=F.record(null,'bird','bird-01');assert.equal(s.counts.bird,1);assert.equal(s.last.bird,'bird-01');assert.equal(s.counts.tarot,0);
 const clean=F.cleanState({counts:{bird:-4},last:{bird:1},name:'客人'});assert.equal(clean.counts.bird,0);assert.equal(clean.last.bird,'');assert.ok(!('name'in clean));
});
for(const method of F.METHODS)test(`七門離席協定：${method}`,()=>{
 assert.deepEqual(F.exitMessage(method,{id:'test'}),{type:'fortune:exit',complete:true,result:{method,id:'test'}});
 assert.deepEqual(F.exitMessage(method,null),{type:'fortune:exit',complete:false,result:null});
});
test('文稿可重建且沒有禁字、外連圖片腳本字型',()=>{
 const before=fs.readFileSync('data/fortunes.json','utf8');
 const blocks=[...fs.readFileSync('content/算命.md','utf8').matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>JSON.parse(m[1]));const compiled={};for(const {method,...entry}of blocks)compiled[method]=entry;assert.deepEqual(compiled,D);
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('data/fortunes.js','utf8'),sandbox);assert.equal(JSON.stringify(sandbox.window.FORTUNE_DATA),JSON.stringify(D));
 assert.doesNotMatch(before,/東西|落|\p{Extended_Pictographic}/u);
 const html=fs.readFileSync('index.html','utf8');assert.doesNotMatch(html,/<(?:script|img|link)[^>]+(?:src|href)=["']https?:/i);
 assert.equal(D.tarot.cards.length,22);assert.equal(D.bird.slips.length,32);
});
