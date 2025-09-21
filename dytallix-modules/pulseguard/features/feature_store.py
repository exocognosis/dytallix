"""Feature store with parquet I/O and versioning."""
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class FeatureStore:
    """Feature store with versioned snapshots."""
    
    def __init__(self, base_dir: str = "./features/artifacts"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_file = self.base_dir / "manifest.json"
        
    def save_features(self, 
                     features: List[Dict[str, Any]], 
                     model_version: str, 
                     feature_type: str = "combined") -> str:
        """Save features with versioning."""
        try:
            if not features:
                logger.warning("No features to save")
                return ""
                
            # Convert to DataFrame
            df = pd.DataFrame(features)
            
            # Generate filename with timestamp
            timestamp = int(time.time())
            filename = f"{feature_type}_{model_version}_{timestamp}.parquet"
            filepath = self.base_dir / filename
            
            # Save as parquet
            df.to_parquet(filepath, index=False)
            
            # Update manifest
            self._update_manifest(filename, model_version, feature_type, df)
            
            logger.info(f"Saved {len(features)} feature records to {filepath}")
            return str(filepath)
            
        except Exception as e:
            logger.error(f"Error saving features: {e}")
            return ""
            
    def load_features(self, 
                     model_version: Optional[str] = None, 
                     feature_type: str = "combined") -> pd.DataFrame:
        """Load features by version and type."""
        try:
            manifest = self._load_manifest()
            
            if not manifest:
                logger.warning("No manifest found")
                return pd.DataFrame()
                
            # Find matching files
            candidates = []
            for entry in manifest.get("files", []):
                if feature_type and entry.get("feature_type") != feature_type:
                    continue
                if model_version and entry.get("model_version") != model_version:
                    continue
                candidates.append(entry)
                
            if not candidates:
                logger.warning(f"No features found for version={model_version}, type={feature_type}")
                return pd.DataFrame()
                
            # Load the most recent one
            latest = max(candidates, key=lambda x: x.get("created_at", 0))
            filepath = self.base_dir / latest["filename"]
            
            if not filepath.exists():
                logger.error(f"Feature file not found: {filepath}")
                return pd.DataFrame()
                
            df = pd.read_parquet(filepath)
            logger.info(f"Loaded {len(df)} feature records from {filepath}")
            return df
            
        except Exception as e:
            logger.error(f"Error loading features: {e}")
            return pd.DataFrame()
            
    def _update_manifest(self, filename: str, model_version: str, feature_type: str, df: pd.DataFrame):
        """Update the feature manifest."""
        try:
            manifest = self._load_manifest()
            
            # Compute feature schema hash
            schema_hash = self._compute_schema_hash(df)
            
            entry = {
                "filename": filename,
                "model_version": model_version,
                "feature_type": feature_type,
                "created_at": int(time.time()),
                "num_records": len(df),
                "num_features": len(df.columns),
                "feature_schema_hash": schema_hash,
                "columns": list(df.columns)
            }
            
            manifest["files"].append(entry)
            manifest["last_updated"] = int(time.time())
            
            # Save manifest
            with open(self.manifest_file, 'w') as f:
                json.dump(manifest, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error updating manifest: {e}")
            
    def _load_manifest(self) -> Dict[str, Any]:
        """Load the feature manifest."""
        try:
            if self.manifest_file.exists():
                with open(self.manifest_file, 'r') as f:
                    return json.load(f)
            else:
                return {"files": [], "created_at": int(time.time())}
        except Exception as e:
            logger.error(f"Error loading manifest: {e}")
            return {"files": [], "created_at": int(time.time())}
            
    def _compute_schema_hash(self, df: pd.DataFrame) -> str:
        """Compute a hash of the feature schema."""
        try:
            import hashlib
            schema_str = "|".join(sorted(df.columns))
            return hashlib.md5(schema_str.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Error computing schema hash: {e}")
            return ""
            
    def get_latest_version(self, feature_type: str = "combined") -> Optional[str]:
        """Get the latest model version for a feature type."""
        try:
            manifest = self._load_manifest()
            
            versions = set()
            for entry in manifest.get("files", []):
                if entry.get("feature_type") == feature_type:
                    versions.add(entry.get("model_version"))
                    
            if not versions:
                return None
                
            # Simple version sorting (assumes v0_1_0 format)
            sorted_versions = sorted(versions)
            return sorted_versions[-1]
            
        except Exception as e:
            logger.error(f"Error getting latest version: {e}")
            return None
            
    def cleanup_old_versions(self, keep_versions: int = 5, feature_type: str = "combined"):
        """Clean up old feature versions."""
        try:
            manifest = self._load_manifest()
            
            # Group by feature type and version
            type_files = [entry for entry in manifest.get("files", []) 
                         if entry.get("feature_type") == feature_type]
                         
            if len(type_files) <= keep_versions:
                return
                
            # Sort by creation time and keep only the latest N
            sorted_files = sorted(type_files, key=lambda x: x.get("created_at", 0))
            files_to_remove = sorted_files[:-keep_versions]
            
            for entry in files_to_remove:
                filepath = self.base_dir / entry["filename"]
                if filepath.exists():
                    filepath.unlink()
                    logger.info(f"Removed old feature file: {filepath}")
                    
            # Update manifest
            manifest["files"] = [entry for entry in manifest["files"] 
                               if entry not in files_to_remove]
                               
            with open(self.manifest_file, 'w') as f:
                json.dump(manifest, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error cleaning up old versions: {e}")


# Global feature store instance
feature_store = FeatureStore()


def save_feature_batch(features: List[Dict[str, Any]], 
                      model_version: str, 
                      feature_type: str = "combined") -> str:
    """Save a batch of features."""
    return feature_store.save_features(features, model_version, feature_type)


def load_feature_batch(model_version: Optional[str] = None, 
                      feature_type: str = "combined") -> pd.DataFrame:
    """Load a batch of features."""
    return feature_store.load_features(model_version, feature_type)