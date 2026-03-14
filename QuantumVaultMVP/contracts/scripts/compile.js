const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { createHash } = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const contractsDir = path.join(projectRoot, 'contracts');
const artifactsDir = path.join(projectRoot, 'artifacts', 'contracts');
const buildInfoDir = path.join(projectRoot, 'artifacts', 'build-info');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function compileContracts() {
  const contractFiles = fs
    .readdirSync(contractsDir)
    .filter((entry) => entry.endsWith('.sol'))
    .sort();

  if (contractFiles.length === 0) {
    throw new Error(`No Solidity contracts found in ${contractsDir}`);
  }

  const sources = {};
  for (const contractFile of contractFiles) {
    sources[contractFile] = {
      content: fs.readFileSync(path.join(contractsDir, contractFile), 'utf8'),
    };
  }

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = Array.isArray(output.errors) ? output.errors : [];
  const fatalErrors = errors.filter((entry) => entry.severity === 'error');

  if (fatalErrors.length > 0) {
    for (const error of errors) {
      const stream = error.severity === 'error' ? process.stderr : process.stdout;
      stream.write(`${error.formattedMessage}\n`);
    }
    throw new Error(`Solidity compilation failed with ${fatalErrors.length} error(s)`);
  }

  for (const warning of errors) {
    process.stdout.write(`${warning.formattedMessage}\n`);
  }

  ensureDir(artifactsDir);
  ensureDir(buildInfoDir);

  const compilationDigest = createHash('sha256')
    .update(JSON.stringify({ input, output, compiler: solc.version() }))
    .digest('hex');
  const buildInfoPath = path.join(buildInfoDir, `${compilationDigest}.json`);
  fs.writeFileSync(
    buildInfoPath,
    JSON.stringify(
      {
        id: compilationDigest,
        solcVersion: solc.version(),
        input,
        output,
      },
      null,
      2,
    ),
  );

  const emittedArtifacts = [];
  for (const [sourceName, contracts] of Object.entries(output.contracts || {})) {
    const sourceArtifactDir = path.join(artifactsDir, sourceName);
    ensureDir(sourceArtifactDir);

    for (const [contractName, contractOutput] of Object.entries(contracts || {})) {
      const artifact = {
        _format: 'hh-sol-artifact-1',
        contractName,
        sourceName: `contracts/${sourceName}`,
        abi: contractOutput.abi || [],
        bytecode: `0x${contractOutput.evm?.bytecode?.object || ''}`,
        deployedBytecode: `0x${contractOutput.evm?.deployedBytecode?.object || ''}`,
        linkReferences: contractOutput.evm?.bytecode?.linkReferences || {},
        deployedLinkReferences: contractOutput.evm?.deployedBytecode?.linkReferences || {},
      };

      const artifactPath = path.join(sourceArtifactDir, `${contractName}.json`);
      const debugPath = path.join(sourceArtifactDir, `${contractName}.dbg.json`);
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
      fs.writeFileSync(
        debugPath,
        JSON.stringify(
          {
            _format: 'hh-sol-dbg-1',
            buildInfo: path.relative(path.dirname(debugPath), buildInfoPath),
          },
          null,
          2,
        ),
      );

      emittedArtifacts.push({
        sourceName: `contracts/${sourceName}`,
        contractName,
        artifactPath,
      });
    }
  }

  return {
    buildInfoPath,
    emittedArtifacts,
    compilerVersion: solc.version(),
  };
}

function runCheckMode() {
  const result = compileContracts();
  for (const artifact of result.emittedArtifacts) {
    console.log(`Verified artifact: ${artifact.contractName} -> ${artifact.artifactPath}`);
  }
  console.log(`Compiler version: ${result.compilerVersion}`);
}

if (require.main === module) {
  try {
    const result = compileContracts();
    for (const artifact of result.emittedArtifacts) {
      console.log(
        `${process.argv.includes('--check') ? 'Verified artifact' : 'Emitted artifact'}: ${artifact.contractName} -> ${artifact.artifactPath}`,
      );
    }
    console.log(`Build info: ${result.buildInfoPath}`);
    console.log(`Compiler version: ${result.compilerVersion}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  compileContracts,
};
