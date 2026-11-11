# FocusDesk

FocusDesk is a personal workspace for planning tasks, keeping daily notes, and reflecting on progress.

Organize work into projects, break tasks into checklists, and see what matters in a list, board, table, or calendar. A daily journal and reflection space help connect finished work with what you learned. Choose a visual style and an animal companion that make the workspace feel like your own.

Our aim is to make everyday planning feel clear, calm, and personal.

## Run FocusDesk with Docker

The web app, API, and MySQL run in separate containers. Docker Engine with the Compose plugin is required; no Node.js or MySQL installation is needed on the host. MySQL is available only inside the Compose network.

1. Copy `.env.example` to `.env`. Set strong, distinct values for `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET`. Keep `.env` private. Leave `PORT=3001` because the web proxy uses that internal API port.
2. For HTTP, set `WEB_PORT=80`, `PUBLIC_SITE_ADDRESS=:80`, `COOKIE_SECURE=false`, and `ALLOWED_ORIGIN` to the exact browser origin, such as `http://localhost` for local use or `http://<your-server-host>` after a host is assigned. Keep `COMPOSE_FILE=docker-compose.yml`.
3. From the repository root, run:

   ```sh
   docker compose up -d --build
   docker compose ps
   curl http://localhost/api/health
   ```

Open `http://localhost` locally, or `http://<your-server-host>` when installed on a server. Replace the host placeholder only after its address is confirmed. If port 80 is in use for a local test, set both `WEB_PORT` and `PUBLIC_SITE_ADDRESS` to the chosen port, for example `WEB_PORT=18080` and `PUBLIC_SITE_ADDRESS=:18080`, then open `http://localhost:18080`.

The first start creates the database and applies versioned migrations before the API starts. `docker compose ps` should show all three services as healthy. The API health URL is `/api/health`; browser routes such as `/tasks` and `/journal` are served by the web container.

### Self-signed HTTPS

Use this option only when you can provide a certificate and private key on the host. In `.env`, set `COMPOSE_FILE=docker-compose.yml:docker-compose.https.yml`, `WEB_PORT=443`, `PUBLIC_SITE_ADDRESS=:443`, `COOKIE_SECURE=true`, and `ALLOWED_ORIGIN=https://<your-server-host>`. Place `server.crt` and `server.key` in the ignored `certs/` directory. One way to create a local self-signed pair on the target host is:

```sh
mkdir -p certs
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout certs/server.key -out certs/server.crt \
  -subj '/CN=<your-server-host>' \
  -addext 'subjectAltName=DNS:<your-server-host>'
chmod 600 certs/server.key
docker compose up -d --build
```

Open `https://<your-server-host>` and expect a browser warning because a self-signed certificate is not trusted. Never commit `certs/` or `.env`. FocusDesk does not request an automatic certificate. Use HTTP only on a network where that choice is acceptable; HTTP does not encrypt passwords or session traffic.

### Back up and restore

Backups contain account and journal data. Store them privately, preferably outside the server after download. The `backups/` directory is ignored by Git.

```sh
./scripts/backup.sh backups/focusdesk.sql.gz
gzip -t backups/focusdesk.sql.gz
```

To restore, first make a fresh backup of the current database. The restore command stops only this Compose project's web and API services, imports the selected dump into its MySQL database, and starts those services again:

```sh
./scripts/restore.sh backups/focusdesk.sql.gz --yes
docker compose ps
curl http://localhost/api/health
```

Replace `localhost` with the configured host and protocol when checking a remote installation. Restoring replaces database tables with the backup contents; data written after that backup is lost. Do not use `docker compose down -v` unless you deliberately intend to delete the database and Caddy volumes.

### Update and troubleshoot

Back up before updating. In a clean repository checkout, obtain the chosen version and run `docker compose up -d --build` again. Migrations run automatically and skip already applied versions. Check `docker compose ps`, `/api/health`, sign-in, and a saved task or journal entry after the update. For a code rollback, return the checkout to the known working version and rebuild; restore its matching database backup if the newer version changed the schema.

Useful checks:

```sh
docker compose logs --tail=100 db api web
docker compose ps
docker system df
```

If the database is unhealthy, check available disk space and database logs before restarting. If the API is unhealthy, inspect migration and connection errors in `docker compose logs api`. If the web app loads but API calls fail, inspect `docker compose logs web api` and confirm `PUBLIC_SITE_ADDRESS`, `WEB_PORT`, and `ALLOWED_ORIGIN`. Keep old build caches under review on small hosts; inspect `docker system df` before removing anything. Do not delete unrelated Docker projects or volumes.
