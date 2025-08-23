// Enhanced Sanity API Proxy with robust error handling and logging for production
export default async function handler(req, res) {
  console.log('Sanity Proxy Request Received:', {
    url: req.url,
    method: req.method,
    query: req.query,
    headers: req.headers,
    path: req.path || req.url.split('?')[0]
  });

  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }

  try {
    // Get the query parameters from the request
    const { query, projectId = 'ce5tdyqn', dataset = 'production', ...otherParams } = req.query;
    
    console.log('Processing query parameters:', { query, projectId, dataset, otherParams });
    
    if (!query) {
      console.log('Error: Missing query parameter');
      return res.status(400).json({ 
        error: 'Query parameter is required',
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }
    
    // Construct the Sanity API URL with project ID and dataset from parameters or defaults
    const sanityUrl = `https://${projectId}.api.sanity.io/v2023-05-03/data/query/${dataset}`;
    console.log('Using Sanity URL:', sanityUrl);
    
    // Create a new URLSearchParams object for the base query
    const params = new URLSearchParams();
    params.append('query', query);
    
    // Process other parameters - handle special $ parameters for GROQ
    Object.entries(otherParams).forEach(([key, value]) => {
      console.log('Processing parameter:', { key, value });
      
      // If the key starts with $, it's a GROQ parameter
      if (key.startsWith('$')) {
        try {
          // Try to parse the value if it's JSON
          const parsedValue = JSON.parse(value);
          params.append(key, JSON.stringify(parsedValue));
          console.log(`Added GROQ parameter ${key} with parsed JSON value`);
        } catch (e) {
          // If parsing fails, use the raw value
          params.append(key, value);
          console.log(`Added GROQ parameter ${key} with raw value`);
        }
      } else if (key !== 'projectId' && key !== 'dataset') {
        // Regular query parameter (skip projectId and dataset as they're used in the URL)
        params.append(key, value);
        console.log(`Added regular parameter ${key}`);
      }
    });
    
    // Build query string
    const queryString = params.toString();
    const fullUrl = `${sanityUrl}?${queryString}`;

    // Log the request details for debugging
    console.log('Full request URL:', fullUrl);
    console.log('Request method:', req.method);
    console.log('Request params:', params.toString());
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('Sanity API request timed out after 15 seconds');
    }, 15000); // 15 second timeout

    try {
      console.log('Sending request to Sanity API...');
      // Make the request to Sanity with the token
      const response = await fetch(fullUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer skAWoKWyWjwX1Yltb2H0KecdrtvZxvHS4n0itSz1QOwrgPDt0tI17KQAuUHILqvS1jcsM2Zjm1YfM5zc3aLOPOF4oVvaNQ1cp9iWPcsS8rxiA26WM0HWrrqciju6pip7KCSGnn3P9n5Szdb1eYhhuMSQAOUAvipmZHMTJHSTEVTv7XcFYtVn'
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        signal: controller.signal
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      console.log('Sanity API response received with status:', response.status);
      
      // Check if the response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sanity API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        // Try to parse the error as JSON, fall back to text if not possible
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || 'Unknown error' };
        }
        
        return res.status(response.status).json({
          error: 'Sanity API error',
          status: response.status,
          message: errorData.error || errorData.message || response.statusText,
          timestamp: new Date().toISOString(),
          path: req.url
        });
      }

      const data = await response.json();
      
      // Log the response for debugging
      console.log('Sanity API response status:', response.status);
      console.log('Sanity API response data:', data);
      
      // Return the response from Sanity
      res.status(response.status).json(data);
    } catch (innerError) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId);
      console.error('Sanity API request error:', innerError);
      
      throw innerError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Provide more detailed error information based on error type
    let errorMessage = error.message || 'Unknown error';
    let errorStatus = error.status || 500;
    let errorType = 'Proxy error';
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out after 15 seconds';
      errorStatus = 504; // Gateway Timeout
      errorType = 'Timeout error';
    } else if (error.message && error.message.includes('fetch')) {
      errorType = 'Network error';
      // Keep status as 500
    }
    
    res.status(errorStatus).json({
      error: errorType,
      message: errorMessage,
      status: errorStatus,
      timestamp: new Date().toISOString(),
      path: req.url
    });
  }
}
