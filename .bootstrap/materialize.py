#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import lzma
import re
import tarfile
from pathlib import Path

repository_root = Path(__file__).resolve().parents[1]
bootstrap_directory = repository_root / '.bootstrap'
payload = ''.join(
    chunk.read_text(encoding='utf-8').strip()
    for chunk in sorted(bootstrap_directory.glob('payload-*.txt'))
)

if not payload:
    raise RuntimeError('WP-00 bootstrap payload is missing')

archive_bytes = lzma.decompress(base64.b64decode(payload, validate=True))
with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:') as archive:
    archive.extractall(repository_root, filter='data')

web_app_path = repository_root / 'apps' / 'web' / 'src' / 'App.tsx'
web_app_source = web_app_path.read_text(encoding='utf-8')
web_app_source, replacements = re.subn(
    r'} catch \(error\) \{',
    '} catch {',
    web_app_source,
    count=1,
)
if replacements != 1:
    raise RuntimeError('Expected exactly one unused web-shell catch binding')
web_app_path.write_text(web_app_source, encoding='utf-8')

for chunk in bootstrap_directory.glob('payload-*.txt'):
    chunk.unlink()

Path(__file__).unlink()
(repository_root / '.github' / 'workflows' / 'scaffold-wp00.yml').unlink()
bootstrap_directory.rmdir()

print('materialized 71 WP-00 source files')
