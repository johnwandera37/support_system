
// In-memory token storage
let accessToken: string | null = null;
let accessTokenExpiry: number | null = null; // Timestamp in ms

export function setAccessToken(token: string, expiresIn: number) {
  accessToken = token;
  accessTokenExpiry = Date.now() + expiresIn * 1000; // ms from now
}

export function getAccessToken() {
  return accessToken;
}

export function isTokenExpired() {
  if (!accessTokenExpiry) return true;
  // Refresh 5 seconds before actual expiry to be safe
  return Date.now() >= accessTokenExpiry - 5000;
}

export function clearAccessToken() {
  accessToken = null;
  accessTokenExpiry = null;
}
