// Dytallix PQC Wallet - Vanilla JavaScript Implementation

// PQC Algorithm simulation
const PQCAlgorithms = {
    DILITHIUM: 'Dilithium',
    KYBER: 'Kyber'
};

// Global wallet state
let walletState = {
    keyPair: null,
    address: '',
    algorithm: PQCAlgorithms.DILITHIUM,
    transactions: [],
    isGenerating: false,
    isSending: false
};

// Utility functions for cryptographic operations
const CryptoUtils = {
    // Generate random bytes using Web Crypto API
    generateRandomBytes: (length) => {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    },

    // Convert bytes to hex string
    bytesToHex: (bytes) => {
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // Convert hex string to bytes
    hexToBytes: (hex) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    },

    // Simulate Blake3 hash using SHA-256 (for demo purposes)
    blake3Hash: async (data) => {
        const encoder = new TextEncoder();
        const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
        return new Uint8Array(hashBuffer);
    },

    // SHA-256 hash
    sha256Hash: async (data) => {
        const encoder = new TextEncoder();
        const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
        return new Uint8Array(hashBuffer);
    }
};

// Simple SHA-256 implementation for transaction hashing (fallback)
function simpleSha256(message) {
    const msgUint8 = new TextEncoder().encode(message);
    return crypto.subtle.digest('SHA-256', msgUint8).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
}

// PQC KeyPair simulation
class PQCKeyPair {
    constructor(algorithm) {
        this.algorithm = algorithm;
        this.generateKeys();
    }

    generateKeys() {
        switch (this.algorithm) {
            case PQCAlgorithms.DILITHIUM:
                // Simulate Dilithium keypair sizes
                this.publicKey = CryptoUtils.generateRandomBytes(1952);  // Dilithium5 public key size
                this.privateKey = CryptoUtils.generateRandomBytes(4864); // Dilithium5 private key size
                break;
            case PQCAlgorithms.KYBER:
                // Simulate Kyber keypair sizes
                this.publicKey = CryptoUtils.generateRandomBytes(1568);  // Kyber1024 public key size
                this.privateKey = CryptoUtils.generateRandomBytes(3168); // Kyber1024 private key size
                break;
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    getPublicKeyHex() {
        return CryptoUtils.bytesToHex(this.publicKey);
    }

    getPrivateKeyHex() {
        return CryptoUtils.bytesToHex(this.privateKey);
    }
}

// Wallet address generation (matching Rust implementation)
class WalletUtils {
    static async generateAddress(publicKey) {
        // Step 1: Hash the public key with Blake3 (simulated with SHA-256)
        const hash = await CryptoUtils.blake3Hash(publicKey);
        
        // Step 2: Take the first 20 bytes
        const addressBytes = hash.slice(0, 20);
        
        // Step 3: Calculate checksum using SHA-256
        const checksum = await CryptoUtils.sha256Hash(addressBytes);
        
        // Step 4: Append first 4 bytes of checksum
        const payload = new Uint8Array(24);
        payload.set(addressBytes, 0);
        payload.set(checksum.slice(0, 4), 20);
        
        // Step 5: Encode in hexadecimal and add prefix
        const encoded = CryptoUtils.bytesToHex(payload);
        return `dyt1${encoded}`;
    }

    static validateAddress(address) {
        if (!address.startsWith('dyt1')) return false;
        
        const hexPart = address.slice(4);
        if (hexPart.length !== 48) return false; // 24 bytes * 2 hex chars
        
        try {
            CryptoUtils.hexToBytes(hexPart);
            return true;
        } catch {
            return false;
        }
    }

    static async signTransaction(transaction, privateKey, algorithm) {
        // Simulate PQC signing
        const transactionData = JSON.stringify(transaction);
        const hash = await CryptoUtils.sha256Hash(transactionData);
        
        // Simulate signature generation based on algorithm
        let signatureSize;
        switch (algorithm) {
            case PQCAlgorithms.DILITHIUM:
                signatureSize = 4595; // Dilithium5 signature size
                break;
            case PQCAlgorithms.KYBER:
                signatureSize = 1568; // Kyber1024 signature size (for demo)
                break;
            default:
                signatureSize = 64;
        }
        
        const signature = CryptoUtils.generateRandomBytes(signatureSize);
        return {
            signature: CryptoUtils.bytesToHex(signature),
            hash: CryptoUtils.bytesToHex(hash),
            algorithm
        };
    }

    static async generateTransactionHash(from, to, amount) {
        const txData = `${from}${to}${amount}${Date.now()}`;
        return await simpleSha256(txData);
    }
}

// UI Helper functions
const UI = {
    showAlert: (type, message) => {
        const alertsContainer = document.getElementById('alerts-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alertsContainer.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    },

    updateKeypairDisplay: () => {
        const display = document.getElementById('keypair-display');
        const publicAddress = document.getElementById('public-address');
        const publicKey = document.getElementById('public-key');
        const algorithmBadge = document.getElementById('algorithm-badge');
        const keypairWarning = document.getElementById('keypair-warning');
        
        if (walletState.keyPair) {
            display.style.display = 'block';
            publicAddress.textContent = walletState.address;
            publicKey.textContent = UI.formatKey(walletState.keyPair.getPublicKeyHex());
            algorithmBadge.textContent = walletState.algorithm;
            keypairWarning.style.display = 'none';
        } else {
            display.style.display = 'none';
            keypairWarning.style.display = 'block';
        }
    },

    formatKey: (key) => {
        if (!key) return '';
        return key.match(/.{1,64}/g)?.join('\n') || key;
    },

    updateTransactionHistory: () => {
        const historyContainer = document.getElementById('transaction-history');
        const transactionsList = document.getElementById('transactions-list');
        
        if (walletState.transactions.length > 0) {
            historyContainer.style.display = 'block';
            transactionsList.innerHTML = '';
            
            walletState.transactions.forEach(tx => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-details">
                        <div class="history-hash">Hash: ${tx.hash}</div>
                        <div class="history-info">
                            To: ${tx.to.substring(0, 20)}... | Amount: ${tx.amount} DYT | ${tx.algorithm}
                        </div>
                    </div>
                    <div class="history-status status-${tx.status}">
                        ${tx.status.toUpperCase()}
                    </div>
                `;
                transactionsList.appendChild(item);
            });
        } else {
            historyContainer.style.display = 'none';
        }
    },

    setLoading: (elementId, isLoading, loadingText = 'Loading...') => {
        const element = document.getElementById(elementId);
        if (isLoading) {
            element.disabled = true;
            element.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    ${loadingText}
                </div>
            `;
        } else {
            element.disabled = false;
        }
    },

    clearErrors: () => {
        const recipientError = document.getElementById('recipient-error');
        const amountError = document.getElementById('amount-error');
        const recipientInput = document.getElementById('recipient-address');
        const amountInput = document.getElementById('amount');
        
        if (recipientError) recipientError.style.display = 'none';
        if (amountError) amountError.style.display = 'none';
        if (recipientInput) recipientInput.classList.remove('error');
        if (amountInput) amountInput.classList.remove('error');
    },

    showError: (fieldId, message) => {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }
};

// Wallet operations
const WalletOperations = {
    generateKeyPair: async () => {
        if (walletState.isGenerating) return;
        
        walletState.isGenerating = true;
        UI.setLoading('generate-keypair-btn', true, 'Generating...');
        UI.clearErrors();
        
        try {
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const newKeyPair = new PQCKeyPair(walletState.algorithm);
            const newAddress = await WalletUtils.generateAddress(newKeyPair.publicKey);
            
            walletState.keyPair = newKeyPair;
            walletState.address = newAddress;
            
            // Log private key for testing (as required)
            console.log('Generated Private Key (for testing):', newKeyPair.getPrivateKeyHex());
            
            UI.updateKeypairDisplay();
            UI.showAlert('success', `New ${walletState.algorithm} keypair generated successfully!`);
        } catch (error) {
            console.error('Key generation failed:', error);
            UI.showAlert('error', 'Failed to generate keypair. Please try again.');
        } finally {
            walletState.isGenerating = false;
            const btn = document.getElementById('generate-keypair-btn');
            btn.disabled = false;
            btn.textContent = `Generate New ${walletState.algorithm} Keypair`;
        }
    },

    validateTransaction: () => {
        UI.clearErrors();
        let isValid = true;
        
        const recipientAddress = document.getElementById('recipient-address').value.trim();
        const amount = document.getElementById('amount').value.trim();
        
        if (!recipientAddress) {
            UI.showError('recipient-address', 'Recipient address is required');
            isValid = false;
        } else if (!WalletUtils.validateAddress(recipientAddress)) {
            UI.showError('recipient-address', 'Invalid Dytallix address format');
            isValid = false;
        }
        
        if (!amount) {
            UI.showError('amount', 'Amount is required');
            isValid = false;
        } else if (isNaN(amount) || parseFloat(amount) <= 0) {
            UI.showError('amount', 'Amount must be a positive number');
            isValid = false;
        }
        
        return isValid;
    },

    sendTransaction: async () => {
        if (!WalletOperations.validateTransaction()) return;
        if (!walletState.keyPair) {
            UI.showAlert('error', 'Please generate a keypair first');
            return;
        }
        
        if (walletState.isSending) return;
        
        walletState.isSending = true;
        UI.setLoading('send-transaction-btn', true, 'Signing & Sending...');
        
        try {
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const recipientAddress = document.getElementById('recipient-address').value.trim();
            const amount = parseFloat(document.getElementById('amount').value.trim());
            
            const transaction = {
                from: walletState.address,
                to: recipientAddress,
                amount: amount,
                timestamp: Date.now()
            };
            
            // Sign transaction
            const signature = await WalletUtils.signTransaction(
                transaction, 
                walletState.keyPair.privateKey, 
                walletState.algorithm
            );
            
            // Generate transaction hash
            const txHash = await WalletUtils.generateTransactionHash(
                transaction.from,
                transaction.to,
                transaction.amount
            );
            
            // Add to transaction history
            const newTransaction = {
                ...transaction,
                hash: txHash,
                signature: signature.signature,
                signatureHash: signature.hash,
                status: 'pending',
                algorithm: walletState.algorithm
            };
            
            walletState.transactions.unshift(newTransaction);
            UI.updateTransactionHistory();
            
            // Simulate confirmation after 3 seconds
            setTimeout(() => {
                const txIndex = walletState.transactions.findIndex(tx => tx.hash === txHash);
                if (txIndex !== -1) {
                    walletState.transactions[txIndex].status = 'confirmed';
                    UI.updateTransactionHistory();
                }
            }, 3000);
            
            // Clear form
            document.getElementById('recipient-address').value = '';
            document.getElementById('amount').value = '';
            
            UI.showAlert('success', `Transaction sent! Hash: ${txHash.substring(0, 16)}...`);
        } catch (error) {
            console.error('Transaction failed:', error);
            UI.showAlert('error', 'Transaction failed. Please try again.');
        } finally {
            walletState.isSending = false;
            const btn = document.getElementById('send-transaction-btn');
            btn.disabled = false;
            btn.textContent = 'Send Transaction';
        }
    }
};

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', () => {
    // Algorithm selection
    const algorithmSelect = document.getElementById('algorithm-select');
    algorithmSelect.addEventListener('change', (e) => {
        walletState.algorithm = e.target.value;
        document.getElementById('current-algorithm').textContent = walletState.algorithm;
        const btn = document.getElementById('generate-keypair-btn');
        btn.textContent = `Generate New ${walletState.algorithm} Keypair`;
    });

    // Generate keypair button
    document.getElementById('generate-keypair-btn').addEventListener('click', WalletOperations.generateKeyPair);

    // Send transaction button
    document.getElementById('send-transaction-btn').addEventListener('click', WalletOperations.sendTransaction);

    // Form validation on input
    document.getElementById('recipient-address').addEventListener('input', () => {
        if (document.getElementById('recipient-error').style.display === 'block') {
            WalletOperations.validateTransaction();
        }
    });

    document.getElementById('amount').addEventListener('input', () => {
        if (document.getElementById('amount-error').style.display === 'block') {
            WalletOperations.validateTransaction();
        }
    });

    // Generate initial keypair
    setTimeout(() => {
        WalletOperations.generateKeyPair();
    }, 500);
});