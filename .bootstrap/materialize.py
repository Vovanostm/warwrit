#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import json
import lzma
import re
import tarfile
from pathlib import Path
from typing import Any

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


def replace_exactly(path: Path, old: str, new: str, expected: int = 1) -> None:
    source = path.read_text(encoding='utf-8')
    replacements = source.count(old)
    if replacements != expected:
        raise RuntimeError(
            f'Expected {expected} occurrence(s) of {old!r} in {path}, found {replacements}'
        )
    path.write_text(source.replace(old, new), encoding='utf-8')


def read_package(path: Path) -> dict[str, Any]:
    package = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(package, dict):
        raise RuntimeError(f'Expected package object in {path}')
    return package


web_app_path = repository_root / 'apps' / 'web' / 'src' / 'App.tsx'
web_app_source = web_app_path.read_text(encoding='utf-8')
web_app_source, catch_replacements = re.subn(
    r'} catch \(error\) \{',
    '} catch {',
    web_app_source,
    count=1,
)
web_app_source, env_replacements = re.subn(
    r'import\.meta\.env\.VITE_API_BASE_URL',
    "import.meta.env['VITE_API_BASE_URL']",
    web_app_source,
    count=1,
)
if catch_replacements != 1 or env_replacements != 1:
    raise RuntimeError(
        'Expected exactly one catch binding and one Vite environment access to patch'
    )
web_app_path.write_text(web_app_source, encoding='utf-8')

server_source = repository_root / 'apps' / 'server' / 'src'
replace_exactly(server_source / 'config.ts', '.PORT', "['PORT']")
replace_exactly(server_source / 'config.ts', '.DATABASE_URL', "['DATABASE_URL']")
replace_exactly(server_source / 'config.ts', '.HOST', "['HOST']")
replace_exactly(server_source / 'db' / 'migrate.ts', '.DATABASE_URL', "['DATABASE_URL']")
replace_exactly(server_source / 'logger.ts', '.LOG_LEVEL', "['LOG_LEVEL']")

root_package_path = repository_root / 'package.json'
server_package_path = repository_root / 'apps' / 'server' / 'package.json'
root_package = read_package(root_package_path)
server_package = read_package(server_package_path)
root_dev_dependencies = root_package.get('devDependencies')
server_dependencies = server_package.get('dependencies')
server_dev_dependencies = server_package.get('devDependencies')
if not isinstance(root_dev_dependencies, dict) or not isinstance(server_dependencies, dict):
    raise RuntimeError('Expected root devDependencies and server dependencies')
pg_version = server_dependencies.get('pg')
if not isinstance(pg_version, str):
    raise RuntimeError('Server package must own a pg dependency')
root_dev_dependencies['pg'] = pg_version
if isinstance(server_dev_dependencies, dict):
    pg_types_version = server_dev_dependencies.get('@types/pg')
    if isinstance(pg_types_version, str):
        root_dev_dependencies['@types/pg'] = pg_types_version
root_package_path.write_text(
    json.dumps(root_package, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
)

for chunk in bootstrap_directory.glob('payload-*.txt'):
    chunk.unlink()

Path(__file__).unlink()
(repository_root / '.github' / 'workflows' / 'scaffold-wp00.yml').unlink()
bootstrap_directory.rmdir()

print('materialized 71 WP-00 source files')
