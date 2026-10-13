# Frontend Server Operations

The authoritative frontend checkout is `/data/globemind` on the frontend server. The local collaboration entrypoint is `/root/data/globemind-shared`; it contains SSH tooling, not a frontend source checkout. The main Vue application is `/data/globemind/vue_project`, with `shared` and `financial-terminal` as sibling packages.

## Access and development

From `/root/data/globemind-shared`, use `./frontend/remote` for all frontend inspection and changes:

```bash
./frontend/remote status
./frontend/remote list vue_project/src
./frontend/remote read vue_project/package.json
./frontend/remote exec 'git diff --stat'
./frontend/remote shell
./frontend/remote sftp
```

`exec` runs in `/data/globemind` on the frontend server. Use it for development commands and scripts; do not create or sync a local frontend source copy. The development site is managed by the user service and follows source changes automatically. Check it remotely with:

```bash
./frontend/remote exec 'systemctl --user status globemind-frontend-dev'
./frontend/remote exec 'journalctl --user -u globemind-frontend-dev -f'
```

## Checks and production deployment

Run checks remotely from the Vue project directory:

```bash
./frontend/remote exec 'cd vue_project && npm run typecheck'
./frontend/remote exec 'cd vue_project && npm test'
```

Only deploy when the task explicitly authorizes it. The production deploy script builds into a temporary transaction directory, verifies both application entry points, and then replaces `dist`. If replacement fails, it restores the previous `dist`; after a successful replacement, the transaction directory is removed. An authorized deploy can be started with:

```bash
./frontend/remote exec 'cd vue_project && npm run deploy:production'
```

## Version control and generated files

Inspect and operate Git through `./frontend/remote` from the collaboration workspace. Commit from `/data/globemind`, including changes required in `vue_project`, `shared`, and `financial-terminal`. Generated builds, local production settings, and bulk runtime datasets are excluded from Git. Preserve existing unrelated work when editing or cleaning files.
