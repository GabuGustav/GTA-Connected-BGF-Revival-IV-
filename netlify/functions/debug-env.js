// Debug Netlify Environment Variables
// Check what environment variables are actually set on Netlify

function decodeJwtRole(token) {
    if (!token) return null;
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    try {
        let payloadJson;
        try {
            payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        } catch (_) {
            const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            payloadJson = Buffer.from(normalized, 'base64').toString('utf8');
        }
        const payload = JSON.parse(payloadJson);
        return payload.role || null;
    } catch (_) {
        return null;
    }
}

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
        // Check all environment variables
        let resolvedSupabaseUrl = process.env.SUPABASE_URL || null;
        try {
            const client = require('../../supabase-client');
            resolvedSupabaseUrl = client.supabaseUrl || resolvedSupabaseUrl;
        } catch (_) {
            // ignore
        }

        const serviceRoleJwtRole = decodeJwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY);
        const anonJwtRole = decodeJwtRole(process.env.SUPABASE_ANON_KEY);
        const keysAreIdentical = Boolean(
            process.env.SUPABASE_SERVICE_ROLE_KEY
            && process.env.SUPABASE_ANON_KEY
            && process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY
        );

        const envVars = {
            SUPABASE_URL: process.env.SUPABASE_URL || null,
            SUPABASE_URL_RESOLVED: resolvedSupabaseUrl,
            SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL ? 'SET' : 'NOT SET',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
            SUPABASE_SERVICE_ROLE_KEY_JWT_ROLE: serviceRoleJwtRole,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
            SUPABASE_ANON_KEY_JWT_ROLE: anonJwtRole,
            SUPABASE_KEYS_IDENTICAL: keysAreIdentical,
            SUPABASE_KEY_OK_FOR_SERVER_FUNCTIONS: serviceRoleJwtRole === 'service_role',
            SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ? 'SET' : 'NOT SET',
            API_SECRET_KEY: process.env.API_SECRET_KEY,
            NODE_ENV: process.env.NODE_ENV,
            // Also check for any other Supabase variables
            ALL_ENV: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
        };
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                success: true,
                message: 'Environment variables debug',
                environment: envVars,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Debug function error:', error);
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
