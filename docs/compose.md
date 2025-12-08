# Docker Compose

This project includes two Compose files:

- `docker-compose.yml` — production-oriented Compose file which builds the multi-stage Docker image and exposes port `3000`.
- `docker-compose.override.yml` — development override that mounts the current working tree into the container and runs `npm run dev` (nodemon).

Common commands

Start in development (uses `docker-compose.override.yml` automatically):

```bash
docker compose up --build
```

Start in detached mode:

```bash
docker compose up -d --build
```

Stop and remove:

```bash
docker compose down
```

To run production service only (use `docker-compose.yml` explicitly):

```bash
docker compose -f docker-compose.yml up --build -d
```

Notes
- The production image uses the `runtime` target from the `Dockerfile` to keep the image small.
- The dev override mounts the project directory into `/app` and avoids rebuilding on every code change.
