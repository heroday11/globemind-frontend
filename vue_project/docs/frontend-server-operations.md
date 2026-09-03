# Frontend Server Operations

The authoritative frontend checkout is `/data/globemind` on the frontend server.
The main application lives in `vue_project`; `shared` and `financial-terminal` are
required sibling packages.

## Development

Edit files directly under `/data/globemind`. The development site is managed by
the user service and follows source changes automatically:

```bash
systemctl --user status globemind-frontend-dev
journalctl --user -u globemind-frontend-dev -f
```

## Production deployment

Run checks and deploy from the frontend server:

```bash
cd /data/globemind/vue_project
npm run typecheck
npm test
npm run deploy:production
```

The deployment builds into a staging directory, verifies both application entry
points, and then replaces `dist`. The previous build remains in `dist.previous`
for immediate rollback.

## Version control

Commit from `/data/globemind`, including changes required in `vue_project`,
`shared`, and `financial-terminal`. Generated builds, local production settings,
and bulk runtime datasets are excluded from Git.
