const bcrypt = require('bcrypt');

// Plain text passwords to hash
const passwordsToHash = {
    'admin': 'admin123',
    'testuser': 'password123'
};

async function hashPasswords() {
    console.log('Hashing passwords...');
    
    for (const [username, plainPassword] of Object.entries(passwordsToHash)) {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
            console.log(`${username}: "${hashedPassword}"`);
        } catch (error) {
            console.error(`Error hashing password for ${username}:`, error);
        }
    }
}

hashPasswords();
