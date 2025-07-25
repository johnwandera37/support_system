import { baseURL, endpoints } from "@/config/constants";
import { errLog } from "@/utils/logger";
import axios from "axios";

// Create instance
const api = axios.create({
  baseURL, // or full URL if needed
  withCredentials: true, // 🔥 send cookies like access_token, refresh_token
});

// A flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error); // Something went wrong, reject all
    else prom.resolve(token); // Token refreshed successfully, retry all
  });
  failedQueue = [];
};

// 1️⃣ Request Interceptor
api.interceptors.request.use(
  async (config) => {
    // Inject access_token as Authorization header
    try {
      const { data } = await axios.get(endpoints.accessToken, {
        withCredentials: true,
      });

      if (data?.token) {
        config.headers["Authorization"] = `Bearer ${data.token}`;
      }
    } catch {
      // no token
      errLog("From axios token injector: No token found");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2️⃣ Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response, // normal response from an endpoint
  async (error) => {
    const originalRequest = error.config;
    // Suppose it fails, check 401
    // Prevent loop if already trying to refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(Promise.reject);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(endpoints.refresh, null, {
          withCredentials: true,
        });

        processQueue(null);
        return api(originalRequest); // Retry original request
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.location.href = "/"; // force logout, when there is no internet connection, force logout is triggered, find a way to make it right
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
