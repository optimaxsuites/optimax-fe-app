use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    pub module: String,
    pub record_id: String,
    pub html_content: String,
    pub filename: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub async fn export_pdf(
    app: AppHandle,
    _state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<ExportResult, String> {
    let downloads = app.path().download_dir().map_err(|e| e.to_string())?;
    let out_path: PathBuf = downloads.join(format!("{}.pdf", payload.filename));

    // Phase 4: integrate headless chromium/wkhtmltopdf or printpdf crate here
    // For now: write HTML to temp file so the UI can trigger browser print
    let html_path = std::env::temp_dir().join(format!("{}.html", payload.filename));
    std::fs::write(&html_path, &payload.html_content).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        path: out_path.to_string_lossy().to_string(),
        size_bytes: 0,
    })
}

#[tauri::command]
pub async fn export_excel(
    app: AppHandle,
    _state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<ExportResult, String> {
    let downloads = app.path().download_dir().map_err(|e| e.to_string())?;
    let out_path: PathBuf = downloads.join(format!("{}.xlsx", payload.filename));

    // Phase 4: integrate xlsxwriter crate
    Ok(ExportResult {
        path: out_path.to_string_lossy().to_string(),
        size_bytes: 0,
    })
}
