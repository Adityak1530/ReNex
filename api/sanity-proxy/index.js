export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get the query parameters from the request
    const { query, ...otherParams } = req.query;
    
    // Construct the Sanity API URL
    const sanityUrl = 'https://ce5tdyqn.api.sanity.io/v2023-05-03/data/query/production';
    
    // Build query string
    const queryString = new URLSearchParams({
      query: query,
      ...otherParams
    }).toString();

    // Make the request to Sanity with the token
    const response = await fetch(`${sanityUrl}?${queryString}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer skAWoKWyWjwX1Yltb2H0KecdrtvZxvHS4n0itSz1QOwrgPDt0tI17KQAuUHILqvS1jcsM2Zjm1YfM5zc3aLOPOF4oVvaNQ1cp9iWPcsS8rxiA26WM0HWrrqciju6pip7KCSGnn3P9n5Szdb1eYhhuMSQAOUAvipmZHMTJHSTEVTv7XcFYtVn'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    
    // Return the response from Sanity
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
