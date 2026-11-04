use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn splash_done(app: AppHandle) {
    if let Some(splash) = app.get_webview_window("splash") {
        splash.close().ok();
    }
    if let Some(main) = app.get_webview_window("main") {
        main.show().ok();
        main.set_focus().ok();
    }
}

pub fn create_splash_window(app: &tauri::App) -> tauri::Result<()> {
    // Served from tauri://localhost/splash.html — same origin as main app,
    // so Tauri injects the IPC bridge and invoke() works correctly.
    WebviewWindowBuilder::new(app, "splash", WebviewUrl::App("splash.html".into()))
        .title("")
        .inner_size(544.0, 544.0)
        .resizable(false)
        .decorations(false)
        .center()
        .always_on_top(true)
        .build()?;

    Ok(())
}
