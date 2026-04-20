// Netlify Function to Run GTA Server Sync
// Call this via HTTP to trigger sync on OptiLink hosting

const { syncAllUsers } = require('../../sync-gta-to-supabase');

exports.handler = async (event) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }
    
    try {
        if (event.httpMethod === 'POST') {
            // Run sync
            const result = await syncAllUsers();
            
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: 'GTA server sync completed',
                    result: result
                })
            };
        } else if (event.httpMethod === 'GET') {
            // Get sync status
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    message: 'GTA server sync endpoint ready',
                    usage: {
                        post: 'Trigger sync',
                        info: 'Call POST to start GTA server sync'
                    }
                })
            };
        }
        
    } catch (error) {
        console.error('Sync function error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                success: false,
                error: error.message 
            })
        };
    }
};
