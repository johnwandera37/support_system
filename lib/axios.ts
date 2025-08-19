import { baseURL, endpoints } from "@/config/constants";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog, log } from "@/utils/logger";
import {
  isTokenExpired,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "@/utils/tokenStore";
import axios, { AxiosError } from "axios";

// Create instance
const api = axios.create({
  baseURL, // or full URL if needed
  withCredentials: true, // 🔥 send cookies like access_token, refresh_token
});

let isRefreshing = false; // A flag to prevent infinite refresh loops
let failedQueue: any[] = [];

// Queue handler for waiting requests
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error); // Something went wrong, reject all
    else prom.resolve(token); // Token refreshed successfully, retry all
  });
  failedQueue = [];
};

// Helper to determine error type
const getErrorType = (error: AxiosError) => {
  if (!error.response) return "NETWORK_ERROR";
  const status = error.response.status;
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "OTHER_ERROR";
};

// 1️⃣ Request Interceptor
api.interceptors.request.use(
  async (config) => {
    let accessToken = getAccessToken();

    // Get access token existing in cookies and inject it in the interceptor
    if (!accessToken || isTokenExpired()) {
      try {
        const { data } = await axios.get(endpoints.accessToken, {
          withCredentials: true,
        });

        if (data?.token) {
          setAccessToken(data.token, data.expiresIn);
          accessToken = data.token;
        }
      } catch (error) {
        errLog(`Token fetch error: ${getErrorMessage(error)}`);
      }
    }

    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 2️⃣ Response interceptor for handling auth errors 401s + refresh etc
api.interceptors.response.use(
  (response) => response, // normal response from an endpoint
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    // Suppose it fails,
    const errorType = getErrorType(error);
    const isRefreshRequest = originalRequest?.url?.includes("/refresh");
    const errorResponse = error;

    log("Inspect error response", errorResponse);
    log("Inspect error type", errorType);

    // Handle network errors immediately
    if (errorType === "NETWORK_ERROR") {
      toast({
        title: "Network Error",
        description: "Please check your internet connection.",
        variant: "destructive",
      });
      return Promise.reject(error);
    }

    // Handle service unavailable (Redis down)
    if (errorType === "SERVICE_UNAVAILABLE") {
      toast({
        title: "Service Temporarily Unavailable",
        description:
          "We're experiencing technical difficulties. Please try again later.",
        variant: "destructive",
      });
      return Promise.reject(error);
    }

    // Handle forbidden errors
    // ✅ Handle 403 for normal requests (role-based restriction)
    if (errorType === "FORBIDDEN" && !isRefreshRequest) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to perform this action.",
        variant: "destructive",
      });
      return Promise.reject(error);
    }

    // Handle unauthorized errors (token refresh flow)
    //Handle 401 and prevent loop if already trying to refresh
    if (
      errorType === "UNAUTHORIZED" &&
      !originalRequest._retry &&
      !isRefreshRequest
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

      // Attempt to refresh tokens
      try {
        await axios.post(endpoints.refresh, null, {
          withCredentials: true,
        });

        // 🔥Retrieve the access token + expiry
        const { data } = await axios.get(endpoints.accessToken, {
          withCredentials: true,
        });

        if (data?.token) {
          setAccessToken(data.token, data.expiresIn);
          originalRequest.headers["Authorization"] = `Bearer ${data.token}`;
        }

        processQueue(null);
        return api(originalRequest); // Retry original request
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        const backendErrorMsg = refreshError.response.data.error;
        const refreshErrorType = getErrorType(refreshError);

        errLog("Refresh error check: ", refreshError);
        errLog("Refresh error msg from backend: ", backendErrorMsg);
        errLog("Refresh error type ", refreshErrorType);

        switch (refreshErrorType) {
          case "NETWORK_ERROR":
            toast({
              title: "Network Error",
              description: "Please check your internet connection.",
              variant: "destructive",
            });
            break;
          case "SERVICE_UNAVAILABLE":
            toast({
              title: "Service Unavailable",
              description:
                backendErrorMsg ??
                "Authentication service is currently unavailable.",
              variant: "destructive",
            });
            break;
          case "UNAUTHORIZED":
          case "FORBIDDEN":
            // Handle expired/missing/invalid refresh token (from backend)
            clearAccessToken();
            toast({
              title: "Session Expired",
              description: "Please log in again",
              variant: "destructive",
            });
            window.location.href = "/";
            break;
          default:
            toast({
              title: "Unexpected Error",
              description: "Something went wrong. Please try again.",
              variant: "destructive",
            });
            break;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    // For all other errors
    return Promise.reject(error);
  }
);

export default api;
