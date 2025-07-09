import { baseURL } from "@/config/constants";
import { ZodSchema } from "zod";

// The following is a util that is used for the api fetcher, use it when executing APIs on the front end

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface FetcherOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  validateWith?: ZodSchema; // 👈 Optional Zod schema to validate response
}

export async function fetcher<T = any>(
  urlPath: string,
  options: FetcherOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    queryParams,
    credentials = "include",
    signal,
    validateWith,
  } = options;

  let fullUrl = baseURL + urlPath;
  if (queryParams) {
    const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
    fullUrl += `?${queryString}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials,
    signal,
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(fullUrl, fetchOptions);

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const rawData = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(
      typeof rawData === "string" ? rawData : rawData?.error || "Request failed"
    );
  }

  if (validateWith) {
    const result = validateWith.safeParse(rawData);
    if (!result.success) {
      throw new Error("Invalid response format");
    }
    return result.data;
  }

  return rawData as T;
}
