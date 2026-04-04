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

function loadOTPs() {
    const otpFile = path.join(__dirname, '..', 'otps.json');
    if (fs.existsSync(otpFile)) {
        return JSON.parse(fs.readFileSync(otpFile, 'utf8'));
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
    const { jobType } = event.pathParameters;
    const { limit = 50, offset = 0 } = event.queryStringParameters;
    
    if (!jobType) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Job type required' })
        };
    }
    
    // Verify HMAC signature if provided
    const providedSignature = event.headers['x-bgf-signature'];
    if (providedSignature) {
        const payload = JSON.stringify(event.queryStringParameters);
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
    const leaderboard = [];
    
    for (const [username, user] of Object.entries(users)) {
        if (user.ranks && user.ranks[jobType]) {
            leaderboard.push({
                username,
                player_name: user.player_name || username,
                level: user.ranks[jobType].level,
                experience: user.ranks[jobType].experience,
                title: user.ranks[jobType].title,
                stats: user.ranks[jobType].stats,
                last_active: user.global_stats.last_active
            });
        }
    }
    
    // Sort by experience (descending) then by level (descending)
    leaderboard.sort((a, b) => {
        if (b.experience !== a.experience) {
            return b.experience - a.experience;
        }
        return b.level - a.level;
    });
    
    const paginatedLeaderboard = leaderboard.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jobType,
            totalPlayers: leaderboard.length,
            leaderboard: paginatedLeaderboard,
            currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            totalPages: Math.ceil(leaderboard.length / parseInt(limit))
        })
    };
};
