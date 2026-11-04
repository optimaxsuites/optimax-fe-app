use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::{
    commands::sync::SyncReport,
    db::Database,
    http::ApiClient,
    sync::queue::conflict_strategy_for,
};

pub struct SyncEngine {
    db: Arc<Mutex<Database>>,
    http: Arc<ApiClient>,
}

impl SyncEngine {
    pub fn new(db: Arc<Mutex<Database>>, http: Arc<ApiClient>) -> Self {
        Self { db, http }
    }

    pub async fn flush(&self) -> Result<SyncReport> {
        let ops = {
            let db = self.db.lock().await;
            db.get_pending_ops()?
        };

        let total = ops.len() as u32;
        let mut synced = 0u32;
        let mut failed = 0u32;

        for op in ops {
            let _strategy = conflict_strategy_for(&op.entity);

            let result: Result<serde_json::Value> = match op.operation.as_str() {
                "CREATE" => self.http.post(&op.endpoint, &op.payload).await,
                "UPDATE" => self.http.put(&op.endpoint, &op.payload).await,
                "DELETE" => self.http.delete(&op.endpoint).await,
                _ => Err(anyhow::anyhow!("unknown operation: {}", op.operation)),
            };

            match result {
                Ok(_) => {
                    let db = self.db.lock().await;
                    db.delete_pending_op(&op.id)?;
                    synced += 1;
                }
                Err(_) => {
                    failed += 1;
                }
            }
        }

        Ok(SyncReport {
            synced,
            failed,
            remaining: total - synced,
        })
    }
}
