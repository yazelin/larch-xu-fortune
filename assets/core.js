/* Pure calculation rules shared by the browser and Node tests. MIT. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Fortune = api;
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  const METHODS = ['cezi', 'bird', 'tarot', 'zodiac', 'face', 'day', 'wheel'];
  function seeded(seed) {
    let a = 2166136261;
    for (const ch of String(seed)) a = Math.imul(a ^ ch.codePointAt(0), 16777619);
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const deck = [...items];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  function bird(data, random) { return data.slips[Math.floor(random() * data.slips.length)]; }
  function tarot(data, random) {
    return shuffle(data.cards, random).slice(0, 3).map(card => ({...card, reversed: random() < .5}));
  }
  function zodiac(month, day, data) {
    month = Number(month); day = Number(day);
    const days = [31,29,31,30,31,30,31,31,30,31,30,31];
    if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > days[month-1]) throw new Error('請選有效的出生月日。');
    return [...data.signs].reverse().find(s => month * 100 + day >= s.start) || data.signs.at(-1);
  }
  function format(template, vars) { return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? '')); }
  function cezi(char, data, radical, strokes) {
    char = char.trim();
    if ([...char].length !== 1 || !/^\p{Script=Han}$/u.test(char)) throw new Error('請寫一個漢字。');
    const parts = data.characters[char];
    if (parts) return {id: 'cezi-' + char.codePointAt(0).toString(16), title: char + '　' + parts.join('＋'), text: format(data.reading, {char, parts: parts.join('、')}), parts};
    if (!/^\p{Script=Han}$/u.test(radical || '') || !Number.isInteger(Number(strokes)) || Number(strokes) < 1 || Number(strokes) > 64) throw new Error('此字尚未收錄，請選部首並填總筆畫。');
    return {id: `cezi-generic-${char.codePointAt(0).toString(16)}-${radical}-${strokes}`, title: char + '　借形解意', text: format(data.fallback, {char, radical, strokes}), generic: true};
  }
  function ganzhi(year, month, day) {
    const utc = new Date(0); utc.setUTCFullYear(year, month - 1, day); utc.setUTCHours(0,0,0,0);
    if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month-1 || utc.getUTCDate() !== day) throw new Error('日期無效。');
    const n = ((Math.floor((utc.getTime() - Date.UTC(2000,0,7)) / 86400000) % 60) + 60) % 60;
    return '甲乙丙丁戊己庚辛壬癸'[n % 10] + '子丑寅卯辰巳午未申酉戌亥'[n % 12];
  }
  function dayReading(date, activity, data) {
    const gz = ganzhi(date.getFullYear(), date.getMonth()+1, date.getDate());
    const act = data.activities.find(a => a.id === activity);
    if (!act) throw new Error('請選所問之事。');
    let rule = activity === 'bury' ? 'bury' : 'unknown';
    if (activity === 'wash' && gz[1] === '子') rule = 'washZi';
    if (activity === 'wash' && gz[1] === '卯') rule = 'washMao';
    if (activity === 'study' && gz[0] === '丙') rule = 'studyBing';
    return {id: `day-${gz}-${activity}-${rule}`, title: gz + '日・' + act.label, text: format(data.rules[rule], {ganzhi:gz,activity:act.label}), rule};
  }
  function cleanState(value) {
    const state = {version:1, counts:{}, last:{}};
    for (const m of METHODS) {
      const n = value?.counts?.[m];
      state.counts[m] = Number.isSafeInteger(n) && n >= 0 ? n : 0;
      state.last[m] = typeof value?.last?.[m] === 'string' ? value.last[m].slice(0,300) : '';
    }
    return state;
  }
  function record(state, method, id) {
    const next = cleanState(state);
    if (!METHODS.includes(method) || typeof id !== 'string' || !id) throw new Error('結果無效。');
    next.counts[method]++; next.last[method] = id;
    return next;
  }
  function exitMessage(method, result) {
    return {type:'fortune:exit', complete: Boolean(result), result: result ? {method, id:result.id} : null};
  }
  return {METHODS,seeded,shuffle,bird,tarot,zodiac,cezi,ganzhi,dayReading,format,cleanState,record,exitMessage};
});
