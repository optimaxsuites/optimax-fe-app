use anyhow::Result;
use reqwest::{Client, RequestBuilder};
use serde::de::DeserializeOwned;
use std::sync::RwLock;

const DEFAULT_BASE_URL: &str = "https://be.optimaxsuites.com";

pub struct ApiClient {
    client: Client,
    base_url: RwLock<String>,
    token: RwLock<Option<String>>,
}

impl ApiClient {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("failed to build HTTP client"),
            base_url: RwLock::new(DEFAULT_BASE_URL.to_string()),
            token: RwLock::new(None),
        }
    }

    pub fn set_base_url(&self, url: &str) {
        *self.base_url.write().unwrap() = url.to_string();
    }

    pub fn set_token(&self, token: Option<String>) {
        *self.token.write().unwrap() = token;
    }

    fn build_request(&self, method: &str, path: &str) -> RequestBuilder {
        let url = format!("{}{}", self.base_url.read().unwrap(), path);
        let req = match method {
            "GET"    => self.client.get(&url),
            "POST"   => self.client.post(&url),
            "PUT"    => self.client.put(&url),
            "PATCH"  => self.client.patch(&url),
            "DELETE" => self.client.delete(&url),
            _        => self.client.get(&url),
        };
        if let Some(token) = self.token.read().unwrap().as_deref() {
            req.bearer_auth(token)
        } else {
            req
        }
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        let resp = self.build_request("GET", path).send().await?;
        Ok(resp.json::<T>().await?)
    }

    pub async fn post<B: serde::Serialize, T: DeserializeOwned>(
        &self, path: &str, body: &B,
    ) -> Result<T> {
        let resp = self.build_request("POST", path).json(body).send().await?;
        Ok(resp.json::<T>().await?)
    }

    pub async fn put<B: serde::Serialize, T: DeserializeOwned>(
        &self, path: &str, body: &B,
    ) -> Result<T> {
        let resp = self.build_request("PUT", path).json(body).send().await?;
        Ok(resp.json::<T>().await?)
    }

    pub async fn delete<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        let resp = self.build_request("DELETE", path).send().await?;
        Ok(resp.json::<T>().await?)
    }

    pub fn raw_client(&self) -> &Client {
        &self.client
    }
}
