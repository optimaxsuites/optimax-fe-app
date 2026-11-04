use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use crate::sync::engine::SyncEngine;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingOperation {
    pub id: String,
    pub operation: String,   // CREATE | UPDATE | DELETE
    pub entity: String,      // procurement | inventory | hr | etc.
    pub payload: serde_json::Value,
    pub endpoint: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub synced: u32,
    pub failed: u32,
    pub remaining: u32,
}

#[tauri::command]
pub async fn queue_operation(
    state: State<'_, AppState>,
    op: PendingOperation,
) -> Result<String, String> {
    let db = state.db.lock().await;
    db.insert_pending_op(&op).map_err(|e| e.to_string())?;
    Ok(op.id)
}

#[tauri::command]
pub async fn sync_pending_ops(state: State<'_, AppState>) -> Result<SyncReport, String> {
    let engine = SyncEngine::new(
        state.db.clone(),
        state.http.clone(),
    );
    engine.flush().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pending_count(state: State<'_, AppState>) -> Result<u32, String> {
    let db = state.db.lock().await;
    db.count_pending_ops().map_err(|e| e.to_string())
}
