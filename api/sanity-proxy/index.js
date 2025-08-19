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
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Construct the Sanity API URL
    const sanityUrl = 'https://ce5tdyqn.api.sanity.io/v2023-05-03/data/query/production';
    
    // Create a new URLSearchParams object for the base query
    const params = new URLSearchParams();
    params.append('query', query);
    
    // Process other parameters - handle special $ parameters for GROQ
    Object.entries(otherParams).forEach(([key, value]) => {
      // If the key starts with $, it's a GROQ parameter
      if (key.startsWith('$')) {
        try {
          // Try to parse the value if it's JSON
          const parsedValue = JSON.parse(value);
          params.append(key, JSON.stringify(parsedValue));
        } catch (e) {
          // If parsing fails, use the raw value
          params.append(key, value);
        }
      } else {
        // Regular query parameter
        params.append(key, value);
      }
    });
    
    // Build query string
    const queryString = params.toString();

    // Log the request details for debugging
    console.log('Request URL:', `${sanityUrl}?${queryString}`);
    console.log('Request method:', req.method);
    console.log('Request params:', params.toString());
    
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
    
    // Log the response for debugging
    console.log('Sanity API response status:', response.status);
    console.log('Sanity API response data:', data);
    
    // Return the response from Sanity
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Unknown error';
    const errorStatus = error.status || 500;
    
    res.status(errorStatus).json({
      error: 'Proxy error',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: req.url
    });
  }
}
