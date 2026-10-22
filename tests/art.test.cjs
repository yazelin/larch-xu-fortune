const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {checkArt} = require('../tools/check_art.cjs');
const directory = path.resolve(__dirname, '../assets/img');
test('二十二張牌、十二星座、七門及攤位皆有獨立本機 WebP', () => {
  assert.deepEqual(checkArt(), {tarot:22, zodiac:12, methods:7, stall:1, total:42});
  assert.equal(fs.readdirSync(directory).length, 42);
});
for (const missing of ['tarot_hanged.webp', 'zodiac_aries.webp', 'method_cezi.webp', 'stall.webp']) {
  test(`負控制：少了 ${missing} 必須失敗`, () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-art-'));
    try {
      for (const file of fs.readdirSync(directory)) if (file !== missing) fs.symlinkSync(path.join(directory, file), path.join(temp, file));
      assert.throws(() => checkArt(temp), {message:`缺少圖檔：${missing}`});
    } finally { fs.rmSync(temp, {recursive:true, force:true}); }
  });
}
