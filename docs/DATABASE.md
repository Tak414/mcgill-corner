# Local PostgreSQL + PostGIS

The Laravel 13 backend connects to a local PostgreSQL 17 database with PostGIS 3.7. Docker Compose uses the maintained `postgis/postgis` image, based on the official PostgreSQL image. The `postgres_data` named volume preserves data across container restarts and upgrades within the same major version. The upstream image currently publishes `amd64`; Compose requests that platform explicitly so Apple Silicon Docker Desktop can use its x86 emulation. That emulation may run slower than a native ARM image.

## Prerequisites

- Docker Engine/Desktop with the Compose plugin (`docker compose`)
- PHP 8.3 or newer, Composer, and the PHP PostgreSQL extensions `pdo_pgsql` and `pgsql`

Check the PHP CLI and extensions:

```bash
php -v
php -m | grep -E '^(pdo_pgsql|pgsql)$'
```

If either extension is missing on Ubuntu, install the package matching the PHP CLI version. For Ubuntu’s default PHP package:

```bash
sudo apt update
sudo apt install php-pgsql
```

For an explicitly versioned PHP 8.5 installation, use the matching package if that PHP version came from a configured Ubuntu package source:

```bash
sudo apt install php8.5-pgsql
```

Then open a new terminal and verify `php -m` again. Do not install a different PHP module version from the one reported by `php -v`.

## First-time setup

From the repository root, create a private Docker environment file and replace the placeholder password with a unique local password:

```bash
cp .env.docker.example .env.docker
```

Start the database:

```bash
docker compose --env-file .env.docker up -d
```

The service is named `db` and listens on `127.0.0.1:5432` by default. Compose passes the local password from `.env.docker`; the example file contains only a placeholder and should never be used as a real password. `.env.docker` is ignored by Git.

Create Laravel’s local environment file if needed:

```bash
cp backend/.env.example backend/.env
```

Set the database fields in `backend/.env` to match `.env.docker`:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=mcgill_corner
DB_USERNAME=mcgill_user
DB_PASSWORD=the-same-local-password-from-.env.docker
```

Then, from `backend/`, clear cached configuration and run the existing Laravel migrations:

```bash
cd backend
php artisan config:clear
php artisan migrate
```

No product tables have been added for events, profiles, neighborhoods, or gamification in this database setup task.

## Check health and PostGIS

Check Compose health:

```bash
docker compose --env-file .env.docker ps
docker inspect --format='{{.State.Health.Status}}' "$(docker compose --env-file .env.docker ps -q db)"
```

Verify the installed extension and required spatial functions:

```bash
docker compose --env-file .env.docker exec -T db \
  psql -U mcgill_user -d mcgill_corner -c \
  "SELECT PostGIS_Version(), PostGIS_Topology_Version(), ST_AsText(ST_MakePoint(-73.5772,45.5041)) AS point, ST_Distance(ST_SetSRID(ST_MakePoint(-73.5772,45.5041),4326)::geography, ST_SetSRID(ST_MakePoint(-73.5782,45.5041),4326)::geography) AS distance_meters;"
```

The query should return PostGIS and topology version strings, a `POINT(-73.5772 45.5041)`, and a non-zero distance in meters.

Check Laravel can connect:

```bash
cd backend
php artisan tinker --execute="dump(DB::selectOne('select current_database() as database, PostGIS_Version() as postgis'));"
```

Run the backend test suite (tests use the in-memory SQLite database defined in `phpunit.xml`):

```bash
php artisan test
```

## Stop, preserve, or reset data

Stop the database without removing its data:

```bash
docker compose --env-file .env.docker down
```

Restart later with `docker compose --env-file .env.docker up -d`. The named volume keeps database files.

To permanently delete the local database volume and all data, run this destructive command only when you intend a full reset:

```bash
docker compose --env-file .env.docker down --volumes
```

Changing `POSTGRES_DB`, `POSTGRES_USER`, or `POSTGRES_PASSWORD` does not rewrite an already initialized data volume. To change credentials, update the database role using SQL or intentionally reset the local volume.

## Troubleshooting

- **Docker socket permission denied:** start Docker Desktop/Engine; on Ubuntu, confirm the daemon is running. If your account needs Docker-group access, add it using your system’s documented Docker installation steps and start a new login session.
- **Port 5432 is already in use:** set `POSTGRES_PORT` to another free host port in `.env.docker`, then set `DB_PORT` in `backend/.env` to the same value.
- **Compose says `POSTGRES_PASSWORD` is required:** copy `.env.docker.example` to `.env.docker` and replace its placeholder.
- **PostGIS functions are missing:** initialization scripts run only when the database volume is first created. For a disposable local database, reset it with `docker compose --env-file .env.docker down --volumes` and start it again. This deletes all local DB data.
- **Laravel says `could not find driver`:** install/enable the matching PHP `pgsql` module, open a new terminal, and verify both `pdo_pgsql` and `pgsql` appear in `php -m`.
- **Laravel cannot connect:** check the container health, then compare the five `DB_*` values in `backend/.env` to `.env.docker`; run `php artisan config:clear` after changing them.
