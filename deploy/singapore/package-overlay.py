#!/usr/bin/env python3
"""Package compiled JS only; use the matching pinned Linux image for native deps."""
from pathlib import Path
import shutil
import tarfile

root = Path(__file__).resolve().parents[2]
out = root / '.codex/keeply-overlay'
if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)
next_dir = root / 'apps/web/.next'
assert (next_dir / 'BUILD_ID').is_file(), 'Run the production web build first'
for name in ('server', 'static', 'node_modules'):
    shutil.copytree(next_dir / name, out / 'web-next' / name, symlinks=True)
for file in next_dir.iterdir():
    if file.is_file() and file.name != 'trace':
        shutil.copy2(file, out / 'web-next' / file.name)
shutil.copy2(next_dir / 'standalone/apps/web/server.js', out / 'web-server.js')
shutil.copytree(root / 'apps/workers/dist', out / 'worker-dist')
shutil.copy2(root / 'deploy/singapore/Dockerfile', out / 'Dockerfile')
# Catch accidental credentials/native binaries in the payload, without logging values.
values = []
for line in (root / '.env.local').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, value = line.split('=', 1)
        if any(word in key for word in ('PASSWORD', 'SECRET', 'API_KEY', 'MASTER_KEY')) and len(value) > 8:
            values.append(value.encode())
for file in out.rglob('*'):
    if file.is_symlink():
        continue
    if file.is_file():
        assert file.suffix != '.node', f'Native binary in overlay: {file.name}'
        raw = file.read_bytes()
        assert not any(secret in raw for secret in values), f'Secret found in {file.name}'
archive = root / '.codex/keeply-overlay.tar.gz'
with tarfile.open(archive, 'w:gz') as tar:
    for item in out.iterdir():
        tar.add(item, arcname=item.name)
print(f'Packaged {archive.stat().st_size // 1024 // 1024} MiB; no configured secrets or native binaries')
