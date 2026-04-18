const { v4: uuidv4 } = require('uuid');

// Generate unique GTA account IDs for all users
const users = ['1111', 'admin', 'testuser', 'testplayer', 'noob_player'];

console.log('Generated GTA Account IDs:');
users.forEach(username => {
    const uniqueId = `gta_${uuidv4()}`;
    console.log(`${username}: "${uniqueId}"`);
});
