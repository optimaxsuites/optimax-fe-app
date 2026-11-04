use axum::{
    body::Body,
    extract::{Request, State},
    http::Method,
    response::Response,
    routing::any,
    Router,
};
use std::sync::Arc;

const BACKEND: &str = "https://be.optimaxsuites.com";
const CORS_ORIGIN: &str = "tauri://localhost";

pub async fn start(port: u16) {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
    {
        Ok(c) => Arc::new(c),
        Err(e) => {
            eprintln!("proxy: failed to build HTTP client: {e}");
            return;
        }
    };

    let app = Router::new()
        .fallback(any(handler))
        .with_state(client);

    let listener = match tokio::net::TcpListener::bind(("127.0.0.1", port)).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("proxy: failed to bind port {port}: {e}");
            return;
        }
    };

    eprintln!("proxy: listening on 127.0.0.1:{port}");
    axum::serve(listener, app).await.ok();
}

async fn handler(
    State(client): State<Arc<reqwest::Client>>,
    req: Request,
) -> Response {
    if req.method() == Method::OPTIONS {
        return cors_preflight();
    }

    let path = req
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");
    let url = format!("{}{}", BACKEND, path);

    eprintln!("proxy: {} {}", req.method(), path);

    let method = match reqwest::Method::from_bytes(req.method().as_str().as_bytes()) {
        Ok(m) => m,
        Err(_) => reqwest::Method::GET,
    };

    let mut fwd_headers = reqwest::header::HeaderMap::new();
    for (k, v) in req.headers() {
        match k.as_str() {
            "host" | "origin" | "referer" | "connection" | "content-length" => continue,
            _ => {}
        }
        if let (Ok(name), Ok(val)) = (
            reqwest::header::HeaderName::from_bytes(k.as_str().as_bytes()),
            reqwest::header::HeaderValue::from_bytes(v.as_bytes()),
        ) {
            fwd_headers.insert(name, val);
        }
    }

    let body_bytes = match axum::body::to_bytes(req.into_body(), 32 * 1024 * 1024).await {
        Ok(b) => b,
        Err(e) => {
            eprintln!("proxy: body read error: {e}");
            return error_response(400);
        }
    };

    let result = client
        .request(method, &url)
        .headers(fwd_headers)
        .body(body_bytes)
        .send()
        .await;

    match result {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let resp_headers = resp.headers().clone();
            let body = match resp.bytes().await {
                Ok(b) => b,
                Err(e) => {
                    eprintln!("proxy: response body read error: {e}");
                    return error_response(502);
                }
            };

            if let Ok(s) = std::str::from_utf8(&body) {
                eprintln!("proxy: response {status} ({} bytes): {}", body.len(), &s[..s.len().min(300)]);
            } else {
                eprintln!("proxy: response {status} ({} bytes)", body.len());
            }

            let mut builder = Response::builder().status(status);

            for (k, v) in &resp_headers {
                match k.as_str() {
                    // Let axum/hyper handle transfer framing — copying these causes empty replies
                    "transfer-encoding" | "content-length" | "content-encoding" => continue,
                    // We add our own CORS headers below
                    _ if k.as_str().starts_with("access-control-") => continue,
                    _ => {}
                }
                if v.as_bytes().iter().all(|&b| b >= 32 && b <= 126) {
                    builder = builder.header(k.as_str(), v.as_bytes());
                }
            }

            match add_cors(builder).body(Body::from(body)) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("proxy: response build error: {e}");
                    error_response(502)
                }
            }
        }
        Err(e) => {
            eprintln!("proxy: forward error: {e}");
            error_response(502)
        }
    }
}

fn cors_preflight() -> Response {
    match add_cors(Response::builder().status(204))
        .header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With",
        )
        .header("Access-Control-Max-Age", "86400")
        .body(Body::empty())
    {
        Ok(r) => r,
        Err(_) => error_response(500),
    }
}

fn add_cors(builder: axum::http::response::Builder) -> axum::http::response::Builder {
    builder
        .header("Access-Control-Allow-Origin", CORS_ORIGIN)
        .header("Access-Control-Allow-Credentials", "true")
        .header(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        )
}

fn error_response(code: u16) -> Response {
    let status = axum::http::StatusCode::from_u16(code).unwrap_or(axum::http::StatusCode::BAD_GATEWAY);
    Response::builder()
        .status(status)
        .body(Body::empty())
        .unwrap_or_else(|_| {
            let mut r = Response::new(Body::empty());
            *r.status_mut() = axum::http::StatusCode::BAD_GATEWAY;
            r
        })
}
