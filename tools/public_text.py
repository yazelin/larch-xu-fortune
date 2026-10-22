#!/usr/bin/env python3
"""Extract all JSON strings for speak-tw, including Markdown fenced prose.
Glyph components are dictionary symbols, reviewed separately from sentences.
"""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/fortunes.json').read_text())
lines = []
def walk(value, path=''):
    if isinstance(value, dict):
        for k, v in value.items():
            walk(v, path + '/' + k)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            walk(v, path + '/' + str(i))
    elif isinstance(value, str):
        if path.startswith('/cezi/characters/'):
            lines.append(value + '　speak-tw-ok：正體字的部件符號，部分不在 Big5 內。')
        else:
            lines.append(value)
walk(data)
output = Path('/tmp/fortune/算命文案檢查.txt')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text('\n'.join(lines) + '\n')
print(output)
