# Local OIDC identity (ID01 / ID02)

The server uses OpenID Connect authorization code flow with PKCE S256 through
`openid-client` v6. It creates an internal account for the validated
`(issuer, subject)` pair. Email, display name, username, provider access tokens,
and browser input do not select or merge accounts. Re-entering through the same
issuer and subject resolves to the same persisted account.

Each login attempt gets random state, nonce, PKCE verifier, and a separate
browser-binding cookie. The database stores a digest of state, the nonce and
verifier, a digest of the browser binding, and a five-minute expiry. The callback
consumes the flow exactly once before exchanging the code. The OIDC client checks
the issuer, audience, expiry, state, nonce and PKCE, and explicitly enables JWS
signature verification with the provider JWKS. The handler also requires a
nonempty subject and exact issuer. Redirect URI is fixed at
`/auth/callback` under the configured public origin. It never uses the incoming
Host header.

The server creates a 256-bit opaque session token and persists only its SHA-256
digest with the account foreign key, creation/expiry timestamps and revocation
state. Login rotates the current browser's session. `/auth/session` checks the
session row in PostgreSQL on every request and returns only the internal account
ID. `POST /auth/logout` revokes the current session and clears the cookie. Unsafe
HTTP methods require an exact matching Origin. Cookies are HttpOnly, host-only,
SameSite=Lax and Path `/`; Secure is enabled for HTTPS origins and disabled only
for the configured loopback HTTP fixture. No provider token is sent to or stored
in the browser.

Configure all of `DATABASE_URL`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`,
`OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, and `PUBLIC_ORIGIN` to enable identity.
The server rejects partial configuration, a missing database, an inexact public
origin, or any callback URI except the fixed callback on that origin. HTTP is
accepted only when both the issuer and public origin are loopback URLs.

## Isolated local fixture

The fixture uses the official Dex v2.41.1 image at verified OCI index digest
`sha256:bc7cfce7c17f52864e2bb2a4dc1d2f86a41e3019f6d42e81d92a301fad0c8a1d`
and the official PostgreSQL 17.6 Alpine image at verified OCI index digest
`sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94`.
Dex's fixture uses SQLite on the named volume `warwrit-alpha-identity-dex`;
Warwrit account/session state uses PostgreSQL on the separate named volume
`warwrit-alpha-identity-postgres`. Both containers are in Compose project
`warwrit-alpha-identity`, and both ports bind only to loopback:

- PostgreSQL: `127.0.0.1:55433`
- Dex: `127.0.0.1:5557`
- Fastify: `127.0.0.1:3107`

Run the isolated fixture with:

```sh
bash scripts/identity-local.sh up
DATABASE_URL=postgres://warwrit:warwrit-local-only@127.0.0.1:55433/warwrit pnpm db:migrate:up
bash scripts/identity-local.sh server
```

Open `http://127.0.0.1:3107/auth/login` and sign in as either fixture user:

| Login email               | Local fixture password |
| ------------------------- | ---------------------- |
| `player-one@example.test` | `local-only-pass-one`  |
| `player-two@example.test` | `local-only-pass-two`  |

These credentials are test-only and must not be reused. Confirm
`GET /auth/session` returns an internal account ID, restart Fastify and confirm
the same account ID is returned after signing in again, then log out and confirm
the session endpoint returns 401. The browser session cookie must be HttpOnly,
host-only and absent from local/session storage. Do not include cookies, codes,
state, secrets or tokens in evidence.

`bash scripts/identity-local.sh stop` stops only these two services and retains
both named volumes. It does not remove data. Never run global Compose cleanup for
this fixture.

The Dex fixture demonstrates local standards-based OIDC only. Sign-in with an
external provider, lost-password recovery, provider linking/account merging,
company ownership or recovery, and advertising are outside ID01/ID02 and remain
`NOT_RUN` here. The application has no password login or company-creation path.

## Verification record

The final writer tree passed server build and typecheck, the focused server
config/app/auth tests (8/8), `git diff --check`, Compose configuration parsing,
and launcher shell syntax. The opt-in integration spec passed against the
separate migrated PostgreSQL database using a local RSA test issuer; it verifies
signed-token validation, issuer/audience/nonce/expiry rejection, PKCE,
state/browser binding, one-use callback, unchanged account and session row totals
across rejected callbacks, concurrent unique account creation, discovery retry,
session expiry, logout and Origin rejection. It is not evidence of an external
identity provider or lost-password recovery.

The parent also observed real Chrome sign-in with both Dex users, distinct
internal accounts, same-account re-entry after a Fastify process restart,
per-session logout/revocation, and no browser-storage token. That manual run was
performed on an earlier mutable worktree before the final discovery-retry
change; its exact source tree was not frozen, so it does not prove the final
commit. The final tree still needs the parent-owned browser replay after review.
