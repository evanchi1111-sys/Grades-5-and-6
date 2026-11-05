"""回歸檢查：確認受保護檔案與自然科題庫沒有被改動。
用法（在專案根目錄）：python -I docs/science-phase-a/check-protected.py docs/science-phase-a/protected-manifest.json
"""
import json, hashlib, re, sys, collections
m = json.load(open(sys.argv[1], encoding='utf-8'))
bad = []
for p, h in m['files_sha256'].items():
    try: cur = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    except OSError: bad.append((p, 'MISSING')); continue
    if cur != h: bad.append((p, 'CHANGED'))
print('受保護檔案：', len(m['files_sha256']), '個；異動：', bad or '無')
nat = set(m['nature_question_line_hashes']); rx = re.compile(r'^(mc|tf|fill|match|order|sorting)\((\d+),(-?\d+),(\d+),')
q = collections.defaultdict(list); total = 0
for line in open('index.html', encoding='utf-8'):
    mm = rx.match(line)
    if mm:
        total += 1
        if mm.group(2) in nat: q[mm.group(2)].append(hashlib.sha1(line.rstrip('\n').encode()).hexdigest()[:12])
print('全站題數：', total, '（基線 1479）')
print('自然科題目來源行完全相同：', all(q[u] == m['nature_question_line_hashes'][u] for u in nat))
sys.exit(1 if bad or total != 1479 else 0)
