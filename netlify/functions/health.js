const { response } = require('./_jobs_data');

exports.handler = async () => {
    return response(200, {
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
};
