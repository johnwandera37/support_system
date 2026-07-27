# Dockerizing a Next.js + Prisma + Redis App — Notes from the Smart Support System

This documents how this project was containerized end-to-end: the setup process, every
error hit along the way, why each one happened, and the fix. Written to be reusable as a
reference for future projects with a similar stack (Next.js, Prisma, Postgres, Redis).

---

## Stack

- Next.js (App Router)
- Prisma (custom client output path: `lib/generated/prisma/client`)
- PostgreSQL 17
- Redis 7
- JWT auth + Redis-backed sessions
- Socket.IO
- Deployed via Docker Compose, target host: Oracle Cloud free-tier VM (Ubuntu)

---

## 1. Generating the initial scaffold

Ran `docker init` inside the project, selected Node.js. Answered its prompts:

| Prompt | Answer | Why |
|---|---|---|
| Node version | 22 | Latest stable at the time |
| Package manager | npm | Matches `package-lock.json` |
| Build command | `npm run build` | Produces the optimized `.next` production build; also surfaces missing env vars, Prisma issues, TypeScript errors, and bad imports *before* you ever hit Docker |
| Build output directory | `.next` | Default; revisited later once `output: "standalone"` is added |
| Start command | `npm start` | Maps to `"start": "next start"` in `package.json` |
| Port | `3000` | Standard Next.js dev/prod port |

This produces a `.dockerignore`, `Dockerfile`, `compose.yaml`, and `README.Docker.md`.
Inspect them in that order — `.dockerignore` decides what's even available to `COPY`,
`Dockerfile` decides how the image is built, `compose.yaml` decides how it's run.

### Known gaps in the generated Dockerfile

The default scaffold doesn't know about your specific app's needs. For this project it was
missing:

1. `public/` and `next.config.ts` were not copied into the final stage (only `.next` was).
2. `prisma/` (schema + migrations) wasn't copied at all.
3. It switched to a non-root `USER node` *before* copying files, which is unusual — normally
   you copy everything first, then drop privileges, to avoid file-permission surprises.

These were corrected in the multi-stage rewrite below.

---

## 2. Final multi-stage Dockerfile

Three stages: `deps` (install dependencies) → `builder` (generate Prisma client + build
Next.js) → `runner` (minimal image that actually runs in production).

```dockerfile
# -----------------------------
# Stage 1 - Install dependencies
# -----------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000
RUN npm install --legacy-peer-deps

# -----------------------------
# Stage 2 - Build application
# -----------------------------
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# -----------------------------
# Stage 3 - Production image
# -----------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/lib ./lib
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
```

### Why each non-obvious line is there

- **`apk add --no-cache openssl` (in both `deps` and `runner`)** — Alpine doesn't ship
  OpenSSL by default, and Prisma's query engine binary needs it. Skip this and Prisma
  crashes at runtime even though everything built successfully. See the "Prisma engine
  missing" section below for the full story.
- **`npm config set fetch-retries ...`** — added after hitting repeated `ECONNRESET` /
  `network aborted` errors mid-`npm install` inside Docker (see Networking section).
  Doesn't fix a hard connectivity problem, but absorbs transient drops.
- **`COPY --from=builder /usr/src/app/lib ./lib`** — only needed because this project uses
  a **custom Prisma client output path** (`output = "../lib/generated/prisma/client"` in
  `schema.prisma`, instead of the default `node_modules/.prisma`). If you copy
  `node_modules` alone, the generated client silently isn't there and imports like
  `@/lib/generated/prisma/client` fail. If your project uses Prisma's default output
  location, you can skip this line — it's already inside `node_modules`.
- **`docker-entrypoint.sh` as `ENTRYPOINT`** instead of a plain `CMD ["npm", "start"]** — runs
  migrations automatically on every container start. Covered in full below.

---

## 3. schema.prisma — binary targets

Root cause of the single biggest error in this whole process. Original generator block:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma/client"
}
```

No `binaryTargets` specified means Prisma only generates the engine binary for whatever
platform it was generated *on*. If you generate on WSL/Ubuntu (glibc) but run inside
`node:22-alpine` (musl), the container looks for
`libquery_engine-linux-musl-openssl-3.0.x.so.node` and it simply isn't there — even though
the build succeeded, and even though the app starts and briefly logs "Ready" before
crashing on the first Prisma query.

Fix — generate engines for both environments:

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../lib/generated/prisma/client"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

`"native"` keeps local (WSL/Ubuntu) generation working for `npm run dev`.
`"linux-musl-openssl-3.0.x"` covers the Alpine container. Since `builder` runs
`npx prisma generate` on Alpine itself, this one line change is what actually produces the
correct `.so.node` file for the container.

This, plus the `openssl` package (Section 2) and copying the custom `lib/` output
(Section 2), together resolve the entire "Prisma Client could not locate the Query Engine"
class of error.

---

## 4. Migration entrypoint script

Nothing runs `prisma migrate deploy` automatically by default — a fresh Postgres container
has no tables, and the app will connect fine but every query fails with something like:

```
ERROR: relation "public.User" does not exist
```

That's expected on a brand-new database, not a bug. Instead of running the migration
manually every time (`docker compose exec app npx prisma migrate deploy`), an entrypoint
script automates it on every container start.

`docker-entrypoint.sh` (project root):

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npm start
```

- `set -e` — exit immediately if migrations fail, instead of starting the app against a
  possibly-broken/partial schema.
- `exec npm start` — replaces the shell process with the Node process (rather than running
  it as a child process), so `docker stop` signals reach the app directly for a clean
  shutdown.

**Gotcha:** this file must have Unix (LF) line endings. If created/edited from a Windows
editor, CRLF line endings break the `#!/bin/sh` shebang with a cryptic "not found" error.
Check with `file docker-entrypoint.sh` — it should say `ASCII text`, not mention "CRLF line
terminators". Fix if needed: `sed -i 's/\r$//' docker-entrypoint.sh`.

Wired into the Dockerfile via `COPY` + `chmod +x` + `ENTRYPOINT` (see Section 2).

---

## 5. compose.yaml — final version

```yaml
services:
  app:
    build:
      context: .
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    env_file:
      - .env
    environment:
      NODE_ENV: production

  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: support_system_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Decisions worth remembering

- **No `ports:` on `postgres`/`redis`.** The `app` container reaches them over Docker's
  internal network using the *service name* as the hostname (`postgres`, `redis`) — it
  never needs `localhost`. Publishing their ports to the host is only useful if something
  *outside* Docker (a GUI DB tool, `psql` from the host) needs to reach them directly. Not
  exposing them is both simpler and more secure, especially once this is live on a server.
- **`depends_on` with `condition: service_healthy`** (not just a plain list of service
  names) — a plain `depends_on: [postgres]` only waits for the container process to *start*,
  not for Postgres to actually be ready to accept connections. Without the healthcheck, the
  app can race Postgres on a cold boot and fail its first connection attempt.
  `depends_on` as a mapping (with `condition:` keys) and as a plain list (with `-` dashes)
  are mutually exclusive syntaxes — mixing them produces a YAML validation error
  (`services.app.depends_on.0 must be a string`).

---

## 6. Networking issues hit along the way (WSL2 + Docker)

### `npm install` dying mid-download with `ECONNRESET` / `network aborted`

A quick `curl` to the npm registry from inside a container succeeded instantly, but the full
`npm install` reliably died partway through (200+ seconds in) with a connection reset. This
pattern — small requests fine, long/large transfers reset — is consistent with either an
MTU mismatch or an ISP/network dropping long-lived connections, rather than a total
connectivity failure.

What was tried:
1. Setting Docker's MTU via `/etc/docker/daemon.json` — **only relevant if you're running a
   native Linux Docker Engine**. Check first with `docker context ls` — if it shows
   `desktop-linux`, you're on Docker Desktop, and `/etc/docker/daemon.json` inside WSL is
   ignored entirely. Docker Desktop's own daemon config lives in its Settings UI
   (**Settings → Docker Engine**, edit the JSON there, **Apply & Restart**).
2. Adding npm retry config (see Dockerfile, Section 2) — didn't fix a hard MTU issue, but
   made the install resilient enough to push through intermittent resets.
3. In the end, a combination of retry config plus just re-running the build got a full
   successful build through (900s total — slow, but complete). If this remains a recurring
   problem on a given network, worth testing on a different connection (e.g. mobile hotspot)
   to confirm whether it's ISP-side throttling of long connections.

### How to tell if you're on Docker Desktop vs a native Linux Engine (matters for *any*
daemon-level config change)

```bash
which docker
docker context ls
```

If `docker context ls` shows `desktop-linux`, Docker Desktop is managing the actual engine
inside its own hidden VM — commands like `systemctl restart docker` or editing
`/etc/docker/daemon.json` inside WSL will not apply, because there's no `dockerd` process
running inside WSL itself (`ps aux | grep dockerd` will come up empty, which is *normal* for
this setup, not a sign of anything broken).

### Postgres container silently not attached to any network

After a partial `docker compose up` failure (see next item), `docker inspect
<postgres-container> --format '{{json .NetworkSettings.Networks}}'` returned `{}` — the
container existed and was "Up", but wasn't on any Docker network at all, so `app` couldn't
resolve or reach it by hostname (`getent hosts postgres` returned nothing). This turned out
to be a symptom, not the root cause — see below.

### Root cause: host port conflict with an unrelated project

The actual error, once surfaced:

```
Error response from daemon: failed to set up container networking: driver failed
programming external connectivity on endpoint support_system-redis-1: Bind for
0.0.0.0:6379 failed: port is already allocated
```

A separate, unrelated Compose project (`infrastructure`, a general-purpose Postgres/
MySQL/MongoDB/Redis dev toolbox used across multiple projects) had containers already
bound to host ports `5432` and `6379`. Stopping those containers from the Docker Desktop
dashboard is not equivalent to `docker compose down` — Docker Desktop's stop/start doesn't
necessarily free the port binding the same way removing the container does; in this case
the conflicting containers were actually still running, just not obviously so at a glance.

**Fix:** removed the `ports:` mappings from `postgres` and `redis` in this project's
`compose.yaml` entirely (see Section 5's reasoning — they weren't needed anyway, since
`app` talks to them over the internal Docker network). This also means the `support_system`
stack and the `infrastructure` stack can now run **simultaneously** without any port
conflict, since neither of `support_system`'s Postgres/Redis publish host ports anymore.

If you ever do need host access to this project's specific Postgres (e.g. inspecting data
with a GUI tool while `infrastructure`'s Postgres is also running), map to a *different*
host port to avoid the clash: `"5433:5432"`.

---

## 7. Environment variables: local dev vs. containerized

Two different `DATABASE_URL` / `REDIS_HOST` values are needed depending on how the app is
running, because "localhost" means something different in each context:

```env
# Running via `npm run dev` directly on the host (WSL), against the `infrastructure` stack:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/support_system_db?schema=public"
REDIS_HOST=localhost

# Running via `docker compose up` (this project's own Postgres/Redis containers):
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/support_system_db?schema=public
REDIS_HOST=redis
```

Inside Docker, `app` must use the **Compose service name** (`postgres`, `redis`) as the
hostname — Docker's internal DNS resolves that to the right container on the shared
network. `localhost` inside the `app` container refers to the container itself, where
nothing is listening on those ports.

For now this is a manual toggle before switching between `npm run dev` and
`docker compose up`. A cleaner long-term setup would split this into separate `.env` /
`.env.docker` files and point `env_file:` at the right one — worth doing if the manual
toggling becomes error-prone.

**Verifying which value a running container actually has:**

```bash
docker compose exec app printenv DATABASE_URL
```

**Verifying container-to-container network reachability directly** (useful when the app
reports a connection error but you're not sure if it's config or genuine network/host
issue):

```bash
docker compose exec app sh -c "getent hosts postgres"
```

Empty output means DNS resolution is failing inside the container — check network
attachment (`docker inspect <container> --format '{{json .NetworkSettings.Networks}}'`)
before assuming it's a config typo.

---

## 8. General command reference used throughout

```bash
docker compose build                 # build images, reuses cache
docker compose build --no-cache      # full rebuild, ignores cache (slow — only use when
                                      # you suspect a stale cached layer, not for network errors)
docker compose up                    # start in foreground — watch logs live
docker compose up -d                 # start in background, once confirmed working
docker compose down                  # stop + remove containers and the network (keeps volumes)
docker compose down -v               # same, but ALSO deletes volumes (wipes DB/Redis data —
                                      # use deliberately, not as a routine reset)
docker compose ps                    # container status at a glance
docker compose logs <service>        # logs for one service
docker compose exec app sh           # shell into the running app container
docker compose exec app npx prisma migrate deploy   # manual migration run (now automatic
                                                     # via the entrypoint script, Section 4)
```

---

## 9. Deferred / next steps

Deliberately not done yet, in order of when they make sense:

1. **Full feature testing inside the containerized build** — login, register, JWT cookies,
   Redis sessions, ticket CRUD, file uploads, email sending, Swagger, Socket.IO. Do this
   before optimizing image size — no point shrinking an image that doesn't fully work yet.
2. **`output: "standalone"` in `next.config.ts`** + trimming the Dockerfile to copy only
   `.next/standalone`, `.next/static`, and `public` — reduces image size significantly by
   dropping unneeded `node_modules` and dev tooling from the final image. Do this once
   everything above is verified working, not before (smaller image is worthless if it's
   broken).
3. **`npm ci --omit=dev`** in the `deps` stage instead of `npm install --legacy-peer-deps` —
   same reasoning, deferred until functionality is confirmed, then tightened for a leaner,
   deterministic production install.
4. **Oracle Cloud deployment** — same `docker compose up -d` workflow, plus a reverse proxy
   (Caddy) in front for automatic HTTPS via Let's Encrypt, and eventually a domain instead of
   a bare IP.
