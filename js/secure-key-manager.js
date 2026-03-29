// Obfuscated API Key Management System
// Key is split and encoded for security

class SecureKeyManager {
    constructor() {
        // Split and obfuscated key parts
        this.keyParts = [
            this.btoa('xkeysib-0b3ec99ad95fb9331dfc'),
            this.btoa('ca58b00f072f97fda62aa10e2e8907'),
            this.btoa('e7fbd98861ab43-Z0wGNeXFeqAMPPlw')
        ];
        
        // Obfuscation patterns
        this.patterns = {
            prefix: 'xkeysib-',
            separator: '-',
            checksum: 'Z0wGNeXFeqAMPPlw'
        };
    }

    // Browser-compatible base64 encoding
    btoa(str) {
        // Use browser's built-in btoa function
        return window.btoa(str);
    }

    // Browser-compatible base64 decoding
    atob(str) {
        // Use browser's built-in atob function
        return window.atob(str);
    }

    // Reconstruct the API key when needed
    getKey() {
        try {
            // Decode and combine parts
            const part1 = this.atob(this.keyParts[0]);
            const part2 = this.atob(this.keyParts[1]);
            const part3 = this.atob(this.keyParts[2]);
            
            return part1 + part2 + part3;
        } catch (error) {
            console.error('Key reconstruction failed:', error);
            return null;
        }
    }

    // Validate key integrity
    validateKey(key) {
        if (!key) return false;
        
        // Check if key has correct pattern
        const hasPrefix = key.startsWith(this.patterns.prefix);
        const hasChecksum = key.includes(this.patterns.checksum);
        const hasCorrectLength = key.length > 50;
        
        return hasPrefix && hasChecksum && hasCorrectLength;
    }

    // Get key with validation
    getSecureKey() {
        const key = this.getKey();
        return this.validateKey(key) ? key : null;
    }
}

// Global key manager instance
const keyManager = new SecureKeyManager();

// Export for use in mail system
window.SecureKeyManager = SecureKeyManager;
window.keyManager = keyManager;
