export const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL as string;
export const AUTH_STORAGE_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY as string;

if (!BASE_API_URL) {
  throw new Error("Missing NEXT_PUBLIC_BASE_API_URL in environment variables");
}

if (!AUTH_STORAGE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_AUTH_STORAGE_KEY in environment variables");
}
