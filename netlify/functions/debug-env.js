// Debug Netlify Environment Variables
// Check what environment variables are actually set on Netlify

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

        const envVars = {
            SUPABASE_URL: process.env.SUPABASE_URL || null,
            SUPABASE_URL_RESOLVED: resolvedSupabaseUrl,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
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
