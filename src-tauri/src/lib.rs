mod commands;
mod db;
mod http;
mod proxy;
mod state;
mod sync;

use tauri::{
    menu::{Menu, PredefinedMenuItem, Submenu},
    Manager, WebviewUrl, WebviewWindowBuilder,
};

const PROXY_PORT: u16 = 9877;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Start proxy on Tauri's managed tokio runtime — no custom runtime needed
            tauri::async_runtime::spawn(proxy::start(PROXY_PORT));

            // Minimal menu: only Edit shortcuts (Cmd+C/V/X/A/Z/Shift+Z).
            // No File/View/Window — keeps the menu bar clean while preserving keyboard shortcuts.
            let edit_menu = Submenu::with_items(app, "Edit", true, &[
                &PredefinedMenuItem::undo(app, None)?,
                &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &PredefinedMenuItem::copy(app, None)?,
                &PredefinedMenuItem::paste(app, None)?,
                &PredefinedMenuItem::select_all(app, None)?,
            ])?;
            let menu = Menu::with_items(app, &[&edit_menu])?;
            app.set_menu(menu)?;

            let db = db::Database::open(app.path().app_data_dir()?.join("optimaxerp.db"))?;
            db.run_migrations()?;
            app.manage(state::AppState {
                db: std::sync::Arc::new(tokio::sync::Mutex::new(db)),
                http: std::sync::Arc::new(http::ApiClient::new()),
            });

            let init_script = format!(
                "window.__env = window.__env || {{}}; \
                 window.__env.apiBaseUrl = 'http://127.0.0.1:{}';\
                 window.__env.wsUrl = 'ws://127.0.0.1:{}/ws';",
                PROXY_PORT, PROXY_PORT
            );

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("OptimaXERP")
                .inner_size(1400.0, 900.0)
                .min_inner_size(1024.0, 768.0)
                .resizable(true)
                .center()
                .visible(false)
                .initialization_script(&init_script)
                .build()?;

            commands::splash::create_splash_window(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config::get_workspace_config,
            commands::config::set_workspace_config,
            commands::config::clear_workspace_config,
            commands::auth::save_auth_token,
            commands::auth::get_auth_token,
            commands::auth::clear_auth_token,
            commands::sync::sync_pending_ops,
            commands::sync::queue_operation,
            commands::sync::get_pending_count,
            commands::export::export_pdf,
            commands::export::export_excel,
            commands::http_proxy::http_proxy,
            commands::splash::splash_done,
            commands::updater::get_app_version,
            commands::updater::check_for_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OptimaXERP");
}
