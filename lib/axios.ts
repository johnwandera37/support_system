import axios from "axios";

// Create instance
const api = axios.create({
  baseURL: "/api", // or full URL if needed
  withCredentials: true, // 🔥 send cookies like access_token, refresh_token
});

// Add a request interceptor if needed for logging, etc.
api.interceptors.request.use(
  (config) => {
    // No need to manually set token if using cookies, unless you're doing auth headers
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Optional: auto-redirect to login or refresh token
      console.warn("Unauthorized! You might want to redirect to /login.");
    }
    return Promise.reject(error);
  }
);

export default api;
