#!/usr/bin/env python3
"""Compile the seven JSON blocks in the editable Chinese manuscript. No dependencies."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def build():
    manuscript = (ROOT / 'content/算命.md').read_text()
    blocks = re.findall(r'```json\n(.*?)\n```', manuscript, re.S)
    data = {}
    for block in blocks:
        item = json.loads(block)
        key = item.pop('method')
        if key in data:
            raise ValueError(f'重複算法：{key}')
        data[key] = item
    assert set(data) == {'cezi','bird','tarot','zodiac','face','day','wheel'}
    assert len(data['cezi']['characters']) >= 200
    assert len(data['bird']['slips']) >= 32
    assert len(data['tarot']['cards']) == 22
    for key, item in data.items():
        texts = json.dumps(item, ensure_ascii=False)
        assert '東西' not in texts and '落' not in texts, key
    output = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    (ROOT / 'data/fortunes.json').write_text(output)
    # file:// cannot fetch JSON in browsers; this is exactly the same compiled data.
    (ROOT / 'data/fortunes.js').write_text('window.FORTUNE_DATA = ' + output.rstrip() + ';\n')
    print(f'已編譯 {len(data)} 種算法、{len(data["cezi"]["characters"])} 個拆字。')
if __name__ == '__main__':
    build()
