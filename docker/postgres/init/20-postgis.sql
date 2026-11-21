-- The image enables PostGIS in its default database; IF NOT EXISTS makes this safe
-- across compatible image changes and ensures topology is available as well.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
