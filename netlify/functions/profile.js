const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const serverless = require('serverless-http');

// Data storage (in production, use a real database)
const dataFile = path.join(__dirname, '..', 'data.json');

function loadData() {
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

// HMAC verification function
function verifySignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(signature, expectedSignature);
}

exports.handler = async (event, context) => {
    const { username } = event.pathParameters;
    
    if (!username) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Username required' })
        };
    }
    
    // Verify HMAC signature if provided
    const providedSignature = event.headers['x-bgf-signature'];
    if (providedSignature) {
        const payload = JSON.stringify(event.pathParameters);
        const API_SECRET = process.env.API_SECRET_KEY || 'default-secret-key-change-in-production';
        
        if (!verifySignature(payload, providedSignature, API_SECRET)) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        }
    }
    
    const users = loadData();
    const user = users[username];
    
    if (!user) {
        return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'User not found' })
        };
    }
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            player_name: user.player_name || username,
            gta_linked: user.gta_linked,
            created_from_game: user.created_from_game,
            created_at: user.created_at,
            global_stats: user.global_stats,
            ranks: user.ranks,
            achievements: user.achievements || [],
            inbox: user.inbox || [],
            sent: user.sent || []
        })
    };
};
