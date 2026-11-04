use std::sync::Arc;
use tokio::sync::Mutex;
use crate::{db::Database, http::ApiClient};

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub http: Arc<ApiClient>,
}
