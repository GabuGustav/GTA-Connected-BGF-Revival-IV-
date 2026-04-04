// Internal Mail System for BGF Connected
// This script handles user registration for the internal mail system

// Register user for mail system
function registerMailUser(username) {
    const users = loadMailUsers();
    
    if (!users[username]) {
        users[username] = {
            username: username,
            inbox: [],
            sent: [],
            created_at: new Date().toISOString()
        };
        saveMailUsers(users);
        console.log(`Mail user registered: ${username}`);
        return true;
    }
    
    return false; // User already exists
}

// Load mail users
function loadMailUsers() {
    try {
        const data = localStorage.getItem('bgf_mail_users');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error loading mail users:', error);
        return {};
    }
}

// Save mail users
function saveMailUsers(users) {
    try {
        localStorage.setItem('bgf_mail_users', JSON.stringify(users));
    } catch (error) {
        console.error('Error saving mail users:', error);
    }
}

// Auto-register current user if they exist in main system
function autoRegisterCurrentUser() {
    // Check if user exists in main data system
    const mainData = localStorage.getItem('bgf_connected_data');
    if (mainData) {
        const data = JSON.parse(mainData);
        if (data.currentUser) {
            registerMailUser(data.currentUser);
        }
    }
}

// Initialize mail system
autoRegisterCurrentUser();
