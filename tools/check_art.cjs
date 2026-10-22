/* Validate the same artwork mapping used by the browser. No dependencies. */
const fs = require('node:fs');
const path = require('node:path');
const ART = require('../assets/art.js');
const F = require('../assets/core.js');
const DATA = require('../data/fortunes.json');
function checkArt(directory = path.resolve(__dirname, '../assets/img')) {
  const groups = [
    ['tarot', DATA.tarot.cards.map(x => x.id), ART.tarot, 22],
    ['zodiac', DATA.zodiac.signs.map(x => x.id), ART.zodiac, 12],
    ['methods', F.METHODS, ART.methods, 7]
  ];
  const files = [ART.stall];
  for (const [group, ids, mapping, count] of groups) {
    if (ids.length !== count || Object.keys(mapping).length !== count) throw Error(`${group}：對應數量錯誤`);
    for (const id of ids) {
      if (!mapping[id]) throw Error(`${group}：缺少對應 ${id}`);
      files.push(mapping[id]);
    }
  }
  if (new Set(files).size !== 42) throw Error('圖片必須各自對應，共四十二張');
  for (const file of files) {
    if (!/^[a-z_]+\.webp$/.test(file) || !fs.existsSync(path.join(directory, file))) throw Error(`缺少圖檔：${file}`);
    const buffer = fs.readFileSync(path.join(directory, file));
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') throw Error(`不是 WebP：${file}`);
    const size = ART.sizes[file];
    if (!size || size.length !== 2 || !size.every(n => Number.isInteger(n) && n > 0 && n <= 640)) throw Error(`尺寸資料錯誤：${file}`);
  }
  return {tarot: 22, zodiac: 12, methods: 7, stall: 1, total: files.length};
}
module.exports = {checkArt};
if (require.main === module) {
  try { console.log(JSON.stringify(checkArt(process.argv[2]))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
