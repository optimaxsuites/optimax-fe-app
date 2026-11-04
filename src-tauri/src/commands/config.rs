use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceConfig {
    pub api_base_url: Option<String>,
    pub tenant_id: Option<String>,
    pub tenant_name: Option<String>,
    pub logo_url: Option<String>,
    pub theme: Option<String>,
}

#[tauri::command]
pub async fn get_workspace_config(state: State<'_, AppState>) -> Result<Option<WorkspaceConfig>, String> {
    let db = state.db.lock().await;
    db.get_config("workspace").map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_workspace_config(
    state: State<'_, AppState>,
    config: WorkspaceConfig,
) -> Result<WorkspaceConfig, String> {
    let db = state.db.lock().await;
    db.set_config("workspace", &config).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub async fn clear_workspace_config(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_config("workspace").map_err(|e| e.to_string())
}
