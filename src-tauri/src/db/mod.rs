use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{de::DeserializeOwned, Serialize};
use std::path::PathBuf;
use crate::commands::sync::PendingOperation;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        Ok(Self { conn })
    }

    pub fn run_migrations(&self) -> Result<()> {
        self.conn.execute_batch(include_str!("schema.sql"))?;
        Ok(())
    }

    // ── Config ───────────────────────────────────────────────────────────────

    pub fn get_config<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let mut stmt = self.conn.prepare(
            "SELECT value FROM app_config WHERE key = ?1"
        )?;
        let result: rusqlite::Result<String> = stmt.query_row(params![key], |row| row.get(0));
        match result {
            Ok(json) => Ok(Some(serde_json::from_str(&json)?)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_config<T: Serialize>(&self, key: &str, value: &T) -> Result<()> {
        let json = serde_json::to_string(value)?;
        self.conn.execute(
            "INSERT INTO app_config (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, json],
        )?;
        Ok(())
    }

    pub fn delete_config(&self, key: &str) -> Result<()> {
        self.conn.execute("DELETE FROM app_config WHERE key = ?1", params![key])?;
        Ok(())
    }

    // ── Pending Ops (offline queue) ───────────────────────────────────────────

    pub fn insert_pending_op(&self, op: &PendingOperation) -> Result<()> {
        self.conn.execute(
            "INSERT INTO pending_ops (id, operation, entity, payload, endpoint, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                op.id,
                op.operation,
                op.entity,
                op.payload.to_string(),
                op.endpoint,
                op.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_pending_ops(&self) -> Result<Vec<PendingOperation>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, operation, entity, payload, endpoint, created_at
             FROM pending_ops ORDER BY created_at ASC"
        )?;
        let ops = stmt.query_map([], |row| {
            Ok(PendingOperation {
                id: row.get(0)?,
                operation: row.get(1)?,
                entity: row.get(2)?,
                payload: serde_json::from_str(&row.get::<_, String>(3)?)
                    .unwrap_or(serde_json::Value::Null),
                endpoint: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(ops)
    }

    pub fn delete_pending_op(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM pending_ops WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn count_pending_ops(&self) -> Result<u32> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM pending_ops", [], |row| row.get(0)
        )?;
        Ok(count as u32)
    }

    // ── Cache helpers (extend per module) ────────────────────────────────────

    pub fn upsert_cache(&self, table: &str, key: &str, value: &serde_json::Value) -> Result<()> {
        let json = value.to_string();
        let sql = format!(
            "INSERT INTO {} (key, value, cached_at) VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, cached_at = excluded.cached_at",
            table
        );
        self.conn.execute(&sql, params![key, json])?;
        Ok(())
    }
}
