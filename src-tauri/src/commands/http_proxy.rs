use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use tauri::State;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyRequest {
    pub method: String,
    pub url: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[tauri::command]
pub async fn http_proxy(
    state: State<'_, AppState>,
    request: ProxyRequest,
) -> Result<ProxyResponse, String> {
    let method = reqwest::Method::from_str(&request.method.to_uppercase())
        .map_err(|e| e.to_string())?;

    let mut header_map = HeaderMap::new();
    if let Some(headers) = &request.headers {
        for (k, v) in headers {
            // Skip hop-by-hop headers that should not be forwarded
            let lower = k.to_lowercase();
            if matches!(lower.as_str(), "host" | "origin" | "referer" | "content-length") {
                continue;
            }
            if let (Ok(name), Ok(value)) = (
                HeaderName::from_str(k),
                HeaderValue::from_str(v),
            ) {
                header_map.insert(name, value);
            }
        }
    }

    // Remove content-type from the header map — we'll set it via .json() or .body()
    let is_json = header_map
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("application/json"))
        .unwrap_or(false);

    if is_json {
        header_map.remove(reqwest::header::CONTENT_TYPE);
    }

    let client = &state.http;
    let mut req = client
        .raw_client()
        .request(method, &request.url)
        .headers(header_map);

    req = if let Some(body) = &request.body {
        if is_json {
            match serde_json::from_str::<serde_json::Value>(body) {
                Ok(json_val) => req.json(&json_val),
                Err(_) => req.header(reqwest::header::CONTENT_TYPE, "application/json").body(body.clone()),
            }
        } else {
            req.body(body.clone())
        }
    } else {
        req
    };

    eprintln!("http_proxy: {} {} (json={})", request.method, request.url, is_json);
    let resp = req.send().await.map_err(|e| e.to_string())?;

    let status = resp.status().as_u16();
    let mut resp_headers: HashMap<String, String> = HashMap::new();
    for (k, v) in resp.headers() {
        if let Ok(v_str) = v.to_str() {
            resp_headers.insert(k.to_string(), v_str.to_string());
        }
    }
    let body = resp.text().await.map_err(|e| e.to_string())?;

    Ok(ProxyResponse { status, headers: resp_headers, body })
}
