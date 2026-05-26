const { handler } = require('./netlify/functions/leaderboard');

(async () => {
  const event = {
    httpMethod: 'GET',
    queryStringParameters: { job: 'civilian', limit: '5', offset: '0' },
    headers: {}
  };
  const response = await handler(event);
  console.log('Status:', response.statusCode);
  console.log('Headers:', response.headers);
  console.log('Body:', response.body);
})();