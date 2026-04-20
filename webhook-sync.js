// Simple HTTP Server for GTA Server Webhook
// Run this on any machine to receive webhook calls from GTA server
// Then triggers sync to Supabase

const http = require('http');
const { exec } = require('child_process');
const { syncAllUsers } = require('./sync-gta-to-supabase');

const PORT = 3001; // Different from your main server

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/sync') {
        try {
            const body = await new Promise((resolve) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => resolve(data));
            });
            
            console.log('🔄 Triggering GTA server sync...');
            
            // Run the sync script
            const result = await syncAllUsers();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Sync completed',
                result: result
            }));
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'GTA Server Sync Webhook',
            endpoints: {
                sync: 'POST /sync - Trigger GTA server sync'
            }
        }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 GTA Server Sync Webhook running on port ${PORT}`);
    console.log(`📡 Call: POST http://localhost:${PORT}/sync`);
    console.log(`🌐 Or use: curl -X POST http://localhost:${PORT}/sync`);
});
