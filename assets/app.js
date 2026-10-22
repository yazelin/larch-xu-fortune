/* UI, artwork and iframe transport. No external assets or runtime dependencies. */
(async function () {
  'use strict';
  const F = window.Fortune;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const embed = params.get('embed') === '1';
  if (embed) document.body.classList.add('embed');
  $('theme').onclick = () => {
    const dark = getComputedStyle(document.body).colorScheme === 'dark';
    document.body.classList.toggle('light', dark); document.body.classList.toggle('dark', !dark);
  };
  const svg = body => `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const star = (x,y,r=12) => `<path d="M${x} ${y-r} L${x+3} ${y-3} L${x+r} ${y} L${x+3} ${y+3} L${x} ${y+r} L${x-3} ${y+3} L${x-r} ${y} L${x-3} ${y-3}Z"/>`;
  const birdArt = svg('<path d="M24 78Q12 62 24 45Q36 27 58 42Q62 20 81 26Q99 32 91 51L104 58L89 62Q77 92 43 84L19 94L24 78Z" fill="currentColor" fill-opacity=".1"/><path d="M37 55Q61 51 68 71Q47 83 34 68M49 84L47 99M62 84L66 98M44 99H55M61 99H72M91 51L84 55"/><circle cx="80" cy="39" r="3" fill="currentColor"/>');
  const arts = {
    cezi:svg('<path d="M20 89H93M28 97H83M81 18L93 26L49 78L36 84L40 70Z"/><path d="M44 69L54 77M28 37Q40 30 56 38M28 48H51M28 59H43"/>'),
    bird:birdArt,
    tarot:svg('<rect x="25" y="14" width="66" height="94" rx="4"/><rect x="32" y="21" width="52" height="80" rx="2"/>'+star(58,57,23)+'<circle cx="58" cy="57" r="32"/><path d="M43 90H73"/>'),
    zodiac:svg('<circle cx="60" cy="60" r="45"/><ellipse cx="60" cy="60" rx="45" ry="18" transform="rotate(-30 60 60)"/><path d="M28 28L60 42L83 27M60 42L73 77L40 90"/><circle cx="60" cy="42" r="4"/>'+star(73,77,7)+star(83,27,6)),
    face:svg('<ellipse cx="60" cy="53" rx="30" ry="36"/><path d="M31 46Q20 40 25 58L32 64M89 46Q100 40 95 58L88 64M43 41L52 39M68 39L77 41M43 48H51M69 48H77M60 49L56 62H63M49 72Q60 78 71 72M44 87L39 102H81L76 87"/><circle cx="60" cy="57" r="48"/>'),
    day:svg('<path d="M24 25H96V94H24ZM19 19V101M101 19V101M37 25V94M49 25V94M61 25V94M73 25V94M85 25V94M24 34H96M24 85H96"/><path d="M30 43V72M43 43V64M55 43V76M67 43V67M79 43V72M91 43V59"/>'),
    wheel:svg('<rect x="13" y="13" width="94" height="94"/><circle cx="60" cy="60" r="42"/><circle cx="60" cy="60" r="25"/><path d="M60 18V35M60 85V102M18 60H35M85 60H102M30 30L43 43M77 77L90 90M30 90L43 77M77 43L90 30"/>'+star(60,60,16))
  };
  let DATA;
  try {
    if (location.protocol === 'file:') {
      await new Promise((resolve,reject) => { const s=document.createElement('script'); s.src='data/fortunes.js'; s.onload=resolve; s.onerror=reject; document.head.append(s); });
      DATA = window.FORTUNE_DATA;
    } else {
      const response = await fetch('data/fortunes.json');
      if (!response.ok) throw new Error('資料讀取失敗');
      DATA = await response.json();
    }
  } catch (_) { $('menu-title').textContent = '卦冊尚未備妥，請重新開啟此頁。'; return; }
  const teller = params.get('teller');
  if (teller) $('teller').textContent = teller.slice(0,40);
  let state = F.cleanState(null), hydrated = !embed || window.parent === window;
  let method = null, result = null, busy = false, round = 0, saved = false, exited = false;
  const random = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
  // Hosts can have an opaque sandbox origin; trust the embedding window, never siblings.
  function send(message) { if (parent !== window) parent.postMessage(message, '*'); }
  window.addEventListener('message', e => {
    if (e.source !== parent || e.data?.type !== 'fortune:state' || hydrated) return;
    state = F.cleanState(e.data.state); hydrated = true;
    if (method && !busy && !result) $('cast').disabled = false;
  });
  const readyTimer = embed && parent !== window ? setInterval(() => { if (hydrated) clearInterval(readyTimer); else send({type:'fortune:ready'}); }, 750) : null;
  send({type:'fortune:ready'});
  const eras = {cezi:'後世借字',bird:'鳥語傳箋',tarot:'現代牌陣',zodiac:'熱帶黃道',face:'相法擬寫',day:'漢代日書',wheel:'旋式意象'};
  for (const m of F.METHODS) {
    const b = document.createElement('button'); b.className='choice'; b.dataset.method=m;
    b.innerHTML=arts[m]; const title=document.createElement('span');title.textContent=DATA[m].title;
    const small=document.createElement('small');small.textContent=eras[m];b.append(title,small);
    b.onclick=()=>enter(m);$('choices').append(b);
  }
  const later=document.createElement('button');later.className='choice';later.disabled=true;
  later.innerHTML=svg('<circle cx="60" cy="60" r="33"/>'+star(60,60,18)+'<path d="M60 15V6M60 114V105M15 60H6M114 60H105"/>')+'<span>紫微</span><small>下回開攤</small>';$('choices').append(later);
  function label(text, input) { const l=document.createElement('label');const s=document.createElement('span');s.textContent=text;l.append(s,input);return l; }
  function select(id, entries) { const el=document.createElement('select');el.id=id;for (const [value,text] of entries) {const o=document.createElement('option');o.value=value;o.textContent=text;el.append(o);}return el; }
  function input(id,type,value) {const el=document.createElement('input');el.id=id;el.type=type;el.value=value;return el;}
  function enter(m) {
    round++;method=m;result=null;busy=false;saved=false;exited=false;
    const d=DATA[m];$('menu').hidden=true;$('play').hidden=false;$('heading').textContent=d.title;
    $('method-title').textContent=d.subtitle;$('intro').textContent=d.intro;$('era').textContent=eras[m];
    $('method-note').textContent=d.note;$('error').textContent='';$('answer').hidden=true;
    $('draw-area').replaceChildren();$('ritual').hidden=false;$('inputs').replaceChildren();
    $('scene').hidden=false;$('scene').className='scene';$('scene').innerHTML=arts[m];$('cast').disabled=!hydrated;
    $('cast').textContent={bird:'請小鳥取箋',tarot:'洗牌',wheel:'旋動天盤',zodiac:'查我的星座',day:'請日者閱簡',face:'請相者細看',cezi:'請先生拆字'}[m];
    const fields=$('inputs');
    if(m==='cezi'){
      const c=input('char','text','續');c.maxLength=4;c.autocomplete='off';fields.append(label('寫一個漢字',c));
      const fallback=document.createElement('div');fallback.id='fallback';fallback.hidden=true;
      // speak-tw-ok：康熙部首含 Big5 未收的部首字形，保留字典符號。
      const radicals='一丨丶丿乙亅二亠人儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又口囗土士夂夊夕大女子宀寸小尢尸屮山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬玄玉瓜瓦甘生用田疋疒癶白皮皿目矛矢石示禸禾穴立竹米糸缶网羊羽老而耒耳聿肉臣自至臼舌舛舟艮色艸虍虫血行衣襾見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里金長門阜隶隹雨靑非面革韋韭音頁風飛食首香馬骨高髟鬥鬯鬲鬼魚鳥鹵鹿麥麻黃黍黑黹黽鼎鼓鼠鼻齊齒龍龜龠'; // speak-tw-ok：部首符號，不是簡體改寫。
      const strokes=input('strokes','number','12');strokes.min=1;strokes.max=64;
      fallback.append(label('部首（請依字典選）',select('radical',[...radicals].map(x=>[x,x]))),label('總筆畫',strokes));
      const note=document.createElement('p');note.className='fine';note.textContent=d.fallbackNote;fallback.append(note);fields.append(fallback);
      c.addEventListener('input',()=>fallback.hidden=Boolean(d.characters[c.value.trim()]) || [...c.value.trim()].length!==1);
    }
    if(m==='bird'){const name=input('visitor','text','');name.placeholder='不報名也可以';name.maxLength=30;fields.append(label('你的稱呼（選填）',name));$('scene').innerHTML='<div class="slips">'+ '<i></i>'.repeat(32)+'</div><div class="bird-actor">'+birdArt+'</div>';}
    if(m==='zodiac'){fields.append(label('出生月',select('month',Array.from({length:12},(_,i)=>[i+1,`${i+1} 月`]))),label('出生日',select('date',Array.from({length:31},(_,i)=>[i+1,`${i+1} 日`]))));$('month').onchange=()=>{const max=[31,29,31,30,31,30,31,31,30,31,30,31][Number($('month').value)-1];const old=Number($('date').value);$('date').replaceChildren(...Array.from({length:max},(_,i)=>new Option(`${i+1} 日`,i+1)));$('date').value=Math.min(old,max);};}
    if(m==='face')for(const [key,f]of Object.entries(d.features))fields.append(label(f.label,select(key,f.options.map(o=>[o.id,o.label]))));
    if(m==='day'){fields.append(label('所問之事',select('activity',d.activities.map(a=>[a.id,a.label]))));const now=new Date();const p=document.createElement('p');p.className='fine';p.textContent=`今日 ${now.getFullYear()} 年 ${now.getMonth()+1} 月 ${now.getDate()} 日，依裝置所在時區。`;fields.append(p);}
    if(m==='wheel'){fields.append(label('所問之事',select('question',d.questions.map((q,i)=>[i,q]))));$('scene').innerHTML='<span class="wheel-pointer">▾</span>'+wheelSVG();}
    $('method-title').focus();
  }
  function wheelSVG(){const mansions=[...'角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫'];return `<svg id="wheel-svg" viewBox="0 0 240 240" fill="none" stroke="currentColor" aria-hidden="true"><rect x="12" y="12" width="216" height="216" rx="3" fill="var(--paper)"/><circle cx="120" cy="120" r="104"/><circle cx="120" cy="120" r="78"/><circle cx="120" cy="120" r="36"/>${Array.from({length:8},(_,i)=>`<path d="M120 84V42" transform="rotate(${i*45} 120 120)"/><text x="120" y="64" transform="rotate(${i*45} 120 120)" fill="currentColor" stroke="none" text-anchor="middle" font-size="12">${['北','東北','東','東南','南','西南','西','西北'][i]}</text>`).join('')}${mansions.map((s,i)=>`<text x="120" y="32" transform="rotate(${i*360/28} 120 120)" fill="currentColor" stroke="none" text-anchor="middle" font-size="10">${s}</text>`).join('')}<path d="M120 94L127 113L146 120L127 127L120 146L113 127L94 120L113 113Z" fill="var(--red)" stroke="none"/></svg>`;}
  const delay=ms=>new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?40:ms));
  function answer(r, paragraphs) {
    result=r;busy=false;$('ritual').hidden=true;$('answer').hidden=false;$('result-title').textContent=r.title;$('result-text').replaceChildren();
    for(const text of paragraphs || [r.text]){const p=document.createElement('p');p.textContent=text;$('result-text').append(p);}
    $('source-note').textContent=DATA[method].note;
    if(!saved){state=F.record(state,method,r.id);saved=true;send({type:'fortune:save',state});}
    $('result-title').focus();
  }
  $('ritual').onsubmit=async e=>{
    e.preventDefault();if(busy || !hydrated)return;
    const d=DATA[method], token=round;$('error').textContent='';
    try{
      if(method==='cezi'){answer(F.cezi($('char').value,d,$('radical').value,Number($('strokes').value)));return;}
      if(method==='zodiac'){const s=F.zodiac($('month').value,$('date').value,d);answer({id:'zodiac-'+s.id,title:s.name,text:s.text});return;}
      if(method==='day'){const r=F.dayReading(new Date(),$('activity').value,d);answer(r,[r.text,...($('activity').value==='wash'?[d.washClarification]:[])]);return;}
      if(method==='face'){const selected=Object.entries(d.features).map(([k,v])=>v.options.find(o=>o.id===$(k).value));answer({id:'face-'+selected.map(o=>o.id).join('_'),title:'五官合觀'},[...selected.map(o=>o.text),d.closing]);return;}
      busy=true;$('cast').disabled=true;
      if(method==='bird'){
        const slip=F.bird(d,random);const actor=$('scene').querySelector('.bird-actor');actor.classList.add('bird-walk');actor.style.left=`calc((100% - 100px) * ${(Number(slip.id.slice(-2))-1)/31})`;
        await delay(1600);if(token!==round)return;actor.classList.remove('bird-walk');actor.insertAdjacentHTML('beforeend','<span style="position:absolute;right:8px;top:58px;color:var(--red)">▯</span>');
        const b=document.createElement('button');b.className='slip-open';b.textContent='展開卦箋';b.onclick=()=>{b.remove();answer({id:slip.id,title:slip.title,text:slip.text});};$('draw-area').append(b);$('ritual').hidden=true;
      }
      if(method==='wheel'){
        const index=Math.floor(random()*d.palaces.length);$('wheel-svg').style.transform=`rotate(${1440-index*45}deg)`;
        await delay(2100);if(token!==round)return;answer(d.palaces[index]);
      }
      if(method==='tarot'){
        const cards=F.tarot(d,random);$('scene').classList.add('shuffling');await delay(1250);if(token!==round)return;$('scene').classList.remove('shuffling');$('scene').hidden=true;$('ritual').hidden=true;
        let picked=0;const row=document.createElement('div');row.className='cards';
        for(let i=0;i<3;i++){
          const b=document.createElement('button');b.className='tarot-card';b.disabled=i!==0;b.innerHTML=arts.tarot;const label=document.createElement('span');label.textContent='抽'+d.positions[i]+'牌';b.append(label);
          b.onclick=()=>{
            const c=cards[i];b.classList.add('revealed');b.disabled=true;b.replaceChildren();
            const pos=document.createElement('small');pos.textContent=d.positions[i];
            const art=document.createElement('div');art.innerHTML=tarotArt(Number(c.id.slice(-2)));if(c.reversed)art.className='reverse';
            const name=document.createElement('span');name.textContent=c.name;
            const side=document.createElement('small');side.textContent=c.reversed?'逆位':'正位';b.append(pos,art,name,side);
            picked++;if(picked<3)row.children[picked].disabled=false;
            else answer({id:cards.map(c=>c.id+(c.reversed?'-r':'-u')).join('_'),title:'三張牌，一段路'},cards.map((c,j)=>`${d.positions[j]}・${c.name}（${c.reversed?'逆位':'正位'}）：${c.reversed?d.cards.find(x=>x.id===c.id).reversed:c.upright}`));
          };row.append(b);
        }$('draw-area').append(row);
      }
    }catch(err){busy=false;$('cast').disabled=false;$('error').textContent=err.message;}
  };
  function tarotArt(i){
    // Twenty-two original symbolic faces, independent of any scanned deck artwork.
    const symbols=[
      '<path d="M22 90L55 75L83 100M55 75L69 48L76 60L90 55M69 48L60 35M70 28L76 28M45 60L56 53"/><circle cx="70" cy="30" r="8"/>',
      '<path d="M29 80H93M40 80V101M83 80V101M60 73V40M60 50L35 31M60 50L85 25"/><circle cx="60" cy="28" r="9"/><path d="M48 14Q54 6 60 14Q66 22 72 14Q66 6 60 14Q54 22 48 14"/>',
      '<path d="M26 100V25H38V100M82 100V25H94V100M48 88L54 50H68L75 88ZM48 90H75"/><circle cx="61" cy="37" r="9"/><path d="M56 24Q68 28 71 17"/>',
      '<path d="M25 86Q60 103 96 86M45 84L51 52H71L80 84M49 25L53 16L61 24L70 16L73 25"/><circle cx="61" cy="37" r="10"/>',
      '<path d="M28 94V38H42M92 94V38H78M42 94H78V63H42ZM51 25L54 15L61 22L69 15L72 25"/><circle cx="61" cy="38" r="10"/>',
      '<path d="M60 18V98M45 36H75M48 50H72M51 64H69M27 90L37 74L47 90M76 90L86 74L96 90"/>',
      '<path d="M30 99V67M90 99V67M30 70L53 55M90 70L67 55M50 34L60 25L70 34M60 25V12"/><circle cx="30" cy="55" r="9"/><circle cx="90" cy="55" r="9"/>',
      '<path d="M30 87V60H90V87ZM30 60L42 37H78L90 60M48 37V22H72V37"/><circle cx="40" cy="95" r="8"/><circle cx="80" cy="95" r="8"/>',
      '<path d="M29 78Q27 52 51 56Q66 49 77 67L93 71L87 88H40ZM58 56L65 35L81 45"/><circle cx="70" cy="26" r="9"/>',
      '<path d="M39 102L48 47H70L78 102ZM62 47L86 57M89 38V102M84 49H96V64H84Z"/><circle cx="59" cy="32" r="10"/>',
      '<circle cx="60" cy="60" r="33"/><circle cx="60" cy="60" r="10"/><path d="M60 27V50M60 70V93M27 60H50M70 60H93M36 36L53 53M67 67L84 84M36 84L53 67M67 53L84 36"/>',
      '<path d="M60 22V95M30 42H90M30 42L18 67H42ZM90 42L78 67H102ZM43 95H77"/>',
      '<path d="M20 22H100M70 22V48L51 69L70 86M51 69L32 66M51 69V96L63 104"/><circle cx="75" cy="94" r="9"/>',
      '<path d="M27 94L81 29M60 20Q99 10 99 52M38 91L57 67M63 63L82 39M20 99H100"/>',
      '<path d="M35 34L48 60L60 55L49 29ZM75 67L88 93L100 88L89 62ZM54 54Q80 48 81 72M28 100H70"/>',
      '<path d="M29 42L18 20L41 30M91 42L102 20L79 30M35 47Q60 27 85 47V76H35ZM44 76V99M76 76V99M60 49V62"/>',
      '<path d="M43 105L46 37H77L81 105ZM40 37L60 20L80 37M87 10L69 49H84L57 78M53 61H65M53 81H67"/>',
      star(60,34,25)+'<path d="M19 95Q34 80 49 95T79 95T109 95"/>'+star(29,49,8)+star(92,55,7),
      '<path d="M70 21A23 23 0 1 0 70 64A18 18 0 0 1 70 21ZM22 106L27 73H43L49 106M76 106L81 73H97L103 106M47 109Q62 93 60 78"/>',
      '<circle cx="60" cy="48" r="23"/>'+Array.from({length:12},(_,j)=>`<path d="M60 12V18" transform="rotate(${j*30} 60 48)"/>`).join('')+'<path d="M22 101H98M38 101L46 80H74L83 101"/>',
      '<path d="M42 18L76 33L47 50ZM42 18V50M30 102V81H90V102M47 81V70M73 81V70M60 24V42M53 33H67"/>',
      '<ellipse cx="60" cy="60" rx="34" ry="47"/><path d="M50 87L56 43H66L72 87M46 53L30 64M74 53L90 40"/><circle cx="61" cy="31" r="8"/>'
    ];return svg(symbols[i]);
  }
  $('again').onclick=()=>{const m=method;$('scene').hidden=false;enter(m);};
  function exit(){if(exited)return;exited=true;send(F.exitMessage(method,result));}
  $('leave').onclick=()=>{exit();if(!embed){$('play').hidden=true;$('menu').hidden=false;$('heading').textContent='一席問命';$('menu-title').focus();}else{$('leave').disabled=true;$('leave').textContent='解語已收好';}};
  $('back').onclick=()=>{round++;$('scene').hidden=false;if(embed){exit();$('back').disabled=true;$('back').textContent='已離席';return;}$('play').hidden=true;$('menu').hidden=false;$('heading').textContent='一席問命';method=null;};
  if(DATA[params.get('method')]) enter(params.get('method'));
  else if(params.has('method')){const p=document.createElement('p');p.className='fine';p.textContent='這一門尚未開攤，請從下方選一門。';$('choices').before(p);}
})();
