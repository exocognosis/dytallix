use crate::domain::{Asset, Scan, ScanType, ScanStatus, ScanAsset};
use crate::infrastructure::{Scanner, TlsScanner, HttpScanner, AssetRepository, PostgresAssetRepository};
use anyhow::Result;
use std::sync::Arc;
use uuid::Uuid;

pub struct ScanService {
    asset_repo: Arc<dyn AssetRepository>,
    tls_scanner: TlsScanner,
    http_scanner: HttpScanner,
}

impl ScanService {
    pub fn new(asset_repo: Arc<dyn AssetRepository>) -> Self {
        Self {
            asset_repo,
            tls_scanner: TlsScanner::new(),
            http_scanner: HttpScanner::new(),
        }
    }

    pub async fn run_scan(&self, scan_id: Uuid, targets: Vec<String>, scan_type: ScanType) -> Result<()> {
        // In a real system, this would update the Scan record status to RUNNING
        // For MVP, we assume the caller created the Scan record and we just do the work
        
        let mut total_assets = 0;
        let mut total_non_pqc = 0;

        for target in targets {
            // Determine scanner type based on target or try both
            // MVP: Try TLS first, if it fails or returns nothing useful, try HTTP
            
            let result = if target.contains("http") && !target.starts_with("https") {
                 self.http_scanner.scan(&target).await
            } else {
                 self.tls_scanner.scan(&target).await
            };

            match result {
                Ok(scan_result) => {
                    total_assets += scan_result.assets.len() as i32;
                    total_non_pqc += scan_result.non_pqc_count;

                    for asset in scan_result.assets {
                        // Upsert asset to DB
                        // In MVP, we just create new or update existing based on endpoint
                        // self.asset_repo.upsert(asset).await?;
                        // We need to implement upsert in repository, for now let's assume create
                        // But wait, we need to link it to the scan
                        
                        // For MVP simplicity, we'll just log it or would call repo
                        // self.asset_repo.create(&asset).await?; 
                        // We need to implement `create_or_update` in AssetRepository
                    }
                }
                Err(e) => {
                    // Log error but continue
                    println!("Scan failed for target {}: {}", target, e);
                }
            }
        }

        // Update Scan record with results
        // self.scan_repo.update_status(scan_id, ScanStatus::Success, total_assets, total_non_pqc).await?;
        
        Ok(())
    }
}
