use keyring::Entry;
use tauri::State;
use crate::state::AppState;

const SERVICE: &str = "com.optimaxsuites.erp";
const AUTH_KEY: &str = "auth_token";
const REFRESH_KEY: &str = "refresh_token";

#[tauri::command]
pub async fn save_auth_token(
    _state: State<'_, AppState>,
    access_token: String,
    refresh_token: Option<String>,
) -> Result<(), String> {
    Entry::new(SERVICE, AUTH_KEY)
        .map_err(|e| e.to_string())?
        .set_password(&access_token)
        .map_err(|e| e.to_string())?;

    if let Some(rt) = refresh_token {
        Entry::new(SERVICE, REFRESH_KEY)
            .map_err(|e| e.to_string())?
            .set_password(&rt)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_auth_token(_state: State<'_, AppState>) -> Result<Option<String>, String> {
    match Entry::new(SERVICE, AUTH_KEY).map_err(|e| e.to_string())?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn clear_auth_token(_state: State<'_, AppState>) -> Result<(), String> {
    let _ = Entry::new(SERVICE, AUTH_KEY).map_err(|e| e.to_string())?.delete_password();
    let _ = Entry::new(SERVICE, REFRESH_KEY).map_err(|e| e.to_string())?.delete_password();
    Ok(())
}
