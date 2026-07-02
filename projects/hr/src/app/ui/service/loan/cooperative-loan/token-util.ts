// src/app/ui/service/loan/cooperative-loan/token-util.ts

/**
 * Safely retrieves the current user's access token from sessionStorage or localStorage.
 * Returns the token string (without 'Bearer ' prefix) or null if not found.
 */
export function getTokenFromStorage(): string | null {
  // First, try to get from explicit token keys
  const tokenKeys = ['token', 'Token', 'accessToken', 'accessToken2', 'Token2', 'authToken', 'jwt', 'authorization'];
  
  for (const key of tokenKeys) {
    let token = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (token && token !== 'undefined' && token !== 'null') {
      token = token.trim();
      
      // Remove surrounding quotes
      if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1).trim();
      }

      // Handle cookie format: "optimaxcookie=eyJhbGciOiJIUzI1NiJ9..."
      if (token.includes('=')) {
        const parts = token.split('=');
        // Take the part after the first '=' (the actual token)
        if (parts.length >= 2) {
          token = parts.slice(1).join('=');
        }
      }

      // Remove 'Bearer ' prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      // Validate token looks reasonable
      if (token && token !== 'undefined' && token !== 'null' && token.length > 10) {
        console.log(`[TokenUtil] Successfully extracted token from key: ${key}`);
        return token;
      }
    }
  }
  
  // Fallback: search through all storage items for anything that looks like a JWT
  const allStorage = { ...sessionStorage, ...localStorage };
  for (const [key, value] of Object.entries(allStorage)) {
    if (typeof value === 'string' && value.length > 50) {
      // Check if it looks like a JWT (has 3 parts separated by dots)
      let cleanValue = value;
      
      // Handle cookie prefix if present
      if (cleanValue.includes('=')) {
        const parts = cleanValue.split('=');
        if (parts.length >= 2) {
          cleanValue = parts.slice(1).join('=');
        }
      }
      
      // Check if it looks like a JWT (3 dot-separated segments)
      const segments = cleanValue.split('.');
      if (segments.length === 3 && segments[0] && segments[1] && segments[2]) {
        console.log(`[TokenUtil] Found JWT-like token in key: ${key}`);
        return cleanValue;
      }
    }
  }
  
  console.warn('[TokenUtil] No valid token found in storage');
  return null;
}

/**
 * Debug function to check token status - call this from console
 */
export function debugTokenStatus(): void {
  console.log('=== TOKEN DEBUG ===');
  const token = getTokenFromStorage();
  console.log('Valid token found:', !!token);
  if (token) {
    console.log('Token preview:', token.substring(0, 50) + '...');
    console.log('Token length:', token.length);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token expiry:', new Date(payload.exp * 1000).toLocaleString());
      console.log('Is expired:', Date.now() >= payload.exp * 1000);
      console.log('Token payload:', payload);
    } catch(e) {
      console.log('Could not parse token payload (might not be JWT)');
    }
  }
  
  console.log('Tenant ID:', sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'optimax');
  console.log('User ID:', sessionStorage.getItem('userid') || localStorage.getItem('userid'));
  console.log('==================');
}