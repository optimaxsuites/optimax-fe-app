-- Key-value config store (workspace, user prefs)
CREATE TABLE IF NOT EXISTS app_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- Offline operations queue
CREATE TABLE IF NOT EXISTS pending_ops (
    id          TEXT PRIMARY KEY,
    operation   TEXT NOT NULL CHECK(operation IN ('CREATE','UPDATE','DELETE')),
    entity      TEXT NOT NULL,
    payload     TEXT NOT NULL,
    endpoint    TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT
);

-- Module-level caches (read-only mirrors of backend data)
CREATE TABLE IF NOT EXISTS cache_products (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    cached_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cache_vendors (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    cached_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cache_customers (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    cached_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cache_chart_of_accounts (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    cached_at   TEXT NOT NULL
);
