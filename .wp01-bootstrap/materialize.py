#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import io
import lzma
import tarfile
from pathlib import Path

repository_root = Path(__file__).resolve().parents[1]
bootstrap_directory = repository_root / '.wp01-bootstrap'
payload = ''.join(
    chunk.read_text(encoding='utf-8').strip()
    for chunk in sorted(bootstrap_directory.glob('payload-*.txt'))
)

if not payload:
    raise RuntimeError('WP-01 bootstrap payload is missing')

archive_bytes = lzma.decompress(base64.b64decode(payload, validate=True))
archive_digest = hashlib.sha256(archive_bytes).hexdigest()
expected_digest = 'e31607dba70f00a8f63fdb9a583117f1efb8c4315036e333e6dd03b126b2ddee'
if archive_digest != expected_digest:
    raise RuntimeError(
        f'WP-01 bootstrap payload digest mismatch: expected {expected_digest}, got {archive_digest}'
    )

with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:') as archive:
    members = archive.getmembers()
    archive.extractall(repository_root, members=members, filter='data')

for chunk in bootstrap_directory.glob('payload-*.txt'):
    chunk.unlink()

Path(__file__).unlink()
(repository_root / '.github' / 'workflows' / 'materialize-wp01.yml').unlink()
bootstrap_directory.rmdir()

print(f'materialized {len(members)} WP-01 files')
