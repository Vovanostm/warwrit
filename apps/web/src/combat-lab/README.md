# Local combat lab

In one terminal, run `HOST=127.0.0.1 COMBAT_LAB=1 pnpm --filter @warwrit/server dev`. In another, run `VITE_COMBAT_LAB=1 pnpm --filter @warwrit/web dev`, then open `http://127.0.0.1:5173/combat-lab`. The server uses port 3000 by default. Vite lab mode binds strictly to `127.0.0.1:5173` and proxies to numeric loopback so Fastify receives its exact expected `Host`. Ordinary web development keeps its existing bind and `localhost` proxy behavior.

Starting a battle is explicit. Its capability stays in tab memory; reload loses access to that volatile session. If the create response is uncertain, do not start again: stop/restart the local server, then reload the page. Current-session actions retry only with the same saved request body and ID. The page displays actual server views and does not simulate the missing PB05 opponent scheduler.
