import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename); // available for future use

interface FileHash {
  path: string;
  sha256: string;
  size: number;
}

interface Manifest {
  timestamp: string;
  files: FileHash[];
  totalFiles: number;
  manifestHash: string;
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function walkDirectory(dir: string, baseDir: string, results: FileHash[] = []): FileHash[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath, baseDir, results);
    } else {
      const relativePath = path.relative(baseDir, filePath);
      results.push({
        path: relativePath,
        sha256: hashFile(filePath),
        size: stat.size,
      });
    }
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || './evidence';
  
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  console.log(`Hashing files in: ${targetDir}`);
  
  const files = walkDirectory(targetDir, targetDir);
  const timestamp = new Date().toISOString();
  
  // Sort files by path for consistent ordering
  files.sort((a, b) => a.path.localeCompare(b.path));
  
  // Create manifest hash
  const manifestContent = JSON.stringify({ timestamp, files }, null, 2);
  const manifestHash = createHash('sha256').update(manifestContent).digest('hex');
  
  const manifest: Manifest = {
    timestamp,
    files,
    totalFiles: files.length,
    manifestHash,
  };
  
  // Write manifest
  const manifestPath = path.join(targetDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`\nManifest created: ${manifestPath}`);
  console.log(`Total files: ${files.length}`);
  console.log(`Manifest hash: ${manifestHash}`);
  console.log(`Timestamp: ${timestamp}`);
}

main();
