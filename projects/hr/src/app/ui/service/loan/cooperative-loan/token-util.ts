// src/app/ui/service/loan/cooperative-loan/token-util.ts

/**
 * Safely retrieves the current user's access token from sessionStorage or localStorage.
 * Returns the token string (without 'Bearer ' prefix) or null if not found.
 */
export function getTokenFromStorage(): string | null {
  const keys = ['Token', 'token', 'accessToken', 'Token2', 'accessToken2'];
  for (const key of keys) {
    let token = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (token && token !== 'undefined' && token !== 'null') {
      token = token.trim();
      if (token.startsWith('Bearer ')) {
        return token.slice(7);
      }
      return token;
    }
  }
  return null;
}
