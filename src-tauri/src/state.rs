use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use crate::{db::Database, http::ApiClient};

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub http: Arc<ApiClient>,
    pub proxy_token: Arc<RwLock<Option<String>>>,
}
