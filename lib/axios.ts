import { baseURL, endpoints } from "@/config/constants";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog } from "@/utils/logger";
import axios, { AxiosError } from "axios";

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
    } catch(error) {
      // no token
      errLog(`From axios token injector: ${getErrorMessage(error)}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2️⃣ Response interceptor for handling auth errors 401s + refresh
api.interceptors.response.use(
  (response) => response, // normal response from an endpoint
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    // Suppose it fails,
    const status = error?.response?.status;
    const isUnauthorized = status === 401;
    const isForbidden = status === 403;

    const isRefreshRequest = originalRequest?.url?.includes("/refresh");

    // Prevent loop if already trying to refresh
    if (isUnauthorized && !originalRequest._retry && !isRefreshRequest) {
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
      } catch (refreshError: any) {
        // const err = refreshError as AxiosError;
        processQueue(refreshError, null);

        const refreshStatus = refreshError?.response?.status;
        // Handle expired/missing/invalid refresh token (from your backend)
        if (refreshStatus === 401 || refreshStatus === 403) {
          toast({
            title: "Session Expired",
            description: "Please log in again",
            variant: "destructive",
          });
          window.location.href = "/";
        } else {
          errLog("⚠️ Network or unexpected error during token refresh");
          toast({
            title: "Network Error",
            description: "Please check your internet connection.",
            variant: "destructive",
          });
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
