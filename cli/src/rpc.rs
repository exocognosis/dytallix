use anyhow::{Result, anyhow};
use reqwest::StatusCode;
use serde::{Serialize, Deserialize};
use crate::tx::SignedTx;

#[derive(Clone)]
pub struct RpcClient { pub base: String, client: reqwest::Client }

impl RpcClient {
    pub fn new(base: &str) -> Self { Self { base: base.trim_end_matches('/').into(), client: reqwest::Client::new() } }

    pub async fn get_nonce(&self, address: &str) -> Result<Option<u64>> {
        let url = format!("{}/account/nonce/{}", self.base, address);
        let res = self.client.get(&url).send().await?;
        if res.status() == StatusCode::NOT_FOUND { return Ok(None) }
        if !res.status().is_success() { return Err(anyhow!(format!("nonce fetch error {}", res.status()))) }
        let v: serde_json::Value = res.json().await?;
        if let Some(n) = v["nonce"].as_u64() { Ok(Some(n)) } else { Err(anyhow!("malformed nonce response")) }
    }

    pub async fn submit(&self, stx: &SignedTx) -> Result<BroadcastResponse> {
        // Try /submit then fallback /tx/broadcast
        let body = serde_json::json!({"signed_tx": stx});
        for path in ["/submit", "/tx/broadcast"] {
            let url = format!("{}{}", self.base, path);
            let resp = self.client.post(&url).json(&body).send().await?;
            if resp.status() == StatusCode::NOT_FOUND { continue; }
            if !resp.status().is_success() { return Err(anyhow!(format!("broadcast failed {}: {}", resp.status(), resp.text().await.unwrap_or_default()))) }
            let br: BroadcastResponse = resp.json().await?; return Ok(br);
        }
        Err(anyhow!("no broadcast endpoint available"))
    }
    
    pub async fn call(&self, method: &str, params: &[serde_json::Value]) -> Result<serde_json::Value> {
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        });
        
        let url = format!("{}/rpc", self.base);
        let resp = self.client.post(&url).json(&body).send().await?;
        
        if !resp.status().is_success() {
            return Err(anyhow!(format!("RPC call failed {}: {}", resp.status(), resp.text().await.unwrap_or_default())));
        }
        
        let result: serde_json::Value = resp.json().await?;
        
        if let Some(error) = result.get("error") {
            return Err(anyhow!("RPC error: {}", error));
        }
        
        result.get("result")
            .cloned()
            .ok_or_else(|| anyhow!("No result in RPC response"))
    }

    pub async fn get(&self, path: &str) -> Result<serde_json::Value> {
        let url = format!("{}{}", self.base, path);
        let resp = self.client.get(&url).send().await?;
        
        if !resp.status().is_success() {
            return Err(anyhow!(format!("GET request failed {}: {}", resp.status(), resp.text().await.unwrap_or_default())));
        }
        
        resp.json().await.map_err(Into::into)
    }

    pub async fn post(&self, path: &str, data: &serde_json::Value) -> Result<serde_json::Value> {
        let url = format!("{}{}", self.base, path);
        let resp = self.client.post(&url).json(data).send().await?;
        
        if !resp.status().is_success() {
            return Err(anyhow!(format!("POST request failed {}: {}", resp.status(), resp.text().await.unwrap_or_default())));
        }
        
        resp.json().await.map_err(Into::into)
    }
}

pub async fn post_json(base_url: &str, path: &str, payload: &serde_json::Value) -> Result<String> {
    let client = reqwest::Client::new();
    let url = format!("{}/{}", base_url.trim_end_matches('/'), path.trim_start_matches('/'));
    
    let resp = client.post(&url).json(payload).send().await?;
    
    if !resp.status().is_success() {
        return Err(anyhow!(format!("HTTP {} {}: {}", resp.status(), url, resp.text().await.unwrap_or_default())));
    }
    
    Ok(resp.text().await?)
}

pub async fn get_json(base_url: &str, path: &str) -> Result<String> {
    let client = reqwest::Client::new();
    let url = format!("{}/{}", base_url.trim_end_matches('/'), path.trim_start_matches('/'));
    
    let resp = client.get(&url).send().await?;
    
    if !resp.status().is_success() {
        return Err(anyhow!(format!("HTTP {} {}: {}", resp.status(), url, resp.text().await.unwrap_or_default())));
    }
    
    Ok(resp.text().await?)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BroadcastResponse { pub hash: String, pub status: String }
