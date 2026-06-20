# Equilibre Coaching

Site vitrine Vite/React deploye sur Vercel depuis `artifacts/equilibre-coaching`.

## Commandes

```sh
pnpm install
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/equilibre-coaching run typecheck
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/equilibre-coaching run build
```

Le build Vercel publie `artifacts/equilibre-coaching/dist/public`.
