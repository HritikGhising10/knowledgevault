// src/lib/apiUtils.ts

import { API_BASE_URL } from "@/apiRoute";

// Use environment variable or default for API base URL
// For Next.js, prefix with NEXT_PUBLIC_
// For Create React App or Vite, prefix with REACT_APP_ or VITE_
// Adjust the variable name and default based on your frontend framework


// --- Auth Header Helper ---
export const getAuthHeader = (): HeadersInit => {
    // **IMPORTANT**: Replace this with your actual auth token retrieval logic.
    // Common places to store tokens: localStorage, sessionStorage, or secure HttpOnly cookies (accessed differently).

    // Check if running in a browser environment before accessing localStorage
    if (typeof window !== 'undefined') {
        // Example: Retrieving a JWT token from localStorage
        const token = localStorage.getItem("token"); // Use the key you used during login

        if (token) {
            // Return the standard Bearer token format
            return { 'Authorization': `Bearer ${token}` };
        }
    }

    // Return empty object if no token found or not in browser
    return {};
};

// --- Generic API Request Helper ---
/**
 * A helper function for making fetch requests to the backend API.
 * Handles setting headers, checking response status, parsing JSON, and basic error handling.
 * @param url The API endpoint path (e.g., '/forums', '/users/profile')
 * @param options Standard fetch RequestInit options (method, body, etc.)
 * @returns A Promise resolving to the parsed JSON response (type T) or undefined for No Content responses.
 * @throws An Error if the fetch fails or the response status is not ok (>= 400).
 */
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Combine default headers, auth header, and any custom headers from options
    const headers: HeadersInit = {
        // Assume JSON content type by default for POST/PUT/PATCH unless overridden
        ...(options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && { 'Content-Type': 'application/json' }),
        ...getAuthHeader(), // Add Authorization header if token exists
        ...options.headers, // Allow overriding headers via options
    };

    try {
        // Construct the full API URL
        const fullUrl = `${API_BASE_URL}${url}`;

        // Make the fetch request
        const response = await fetch(fullUrl, { ...options, headers });

        // Check if the response status indicates an error
        if (!response.ok) {
            let errorData = { message: `HTTP error! Status: ${response.status} ${response.statusText}` }; // Default error message

            try {
                // Try parsing a JSON error response body from the backend for more details
                const body = await response.json();
                // Use the backend's message if available and informative
                if (body && body.message) {
                    // NestJS validation errors might be an array in `message`
                    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
                    errorData = { message: message };
                }
            } catch (e) {
                // Ignore if response body isn't JSON or parsing fails
                // Keep the default HTTP status error message
            }

            console.error("API Error Response:", { status: response.status, data: errorData, url: fullUrl, options });

            // Throw an error with the determined message
            throw new Error(errorData.message);
        }

        // Handle successful responses with No Content (e.g., successful DELETE)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return undefined as T; // Return undefined as there's no body to parse
        }

        // Parse and return the successful JSON response body
        return await response.json() as T;

    } catch (error: any) {
        // Log network errors or errors thrown from the !response.ok block
        console.error('API Request Failed:', { url, options, error });

        // Optionally use a toast library for user feedback here
        // import { toast } from "sonner"; // Example
        // toast.error(`Request Failed: ${error.message}`);

        // Re-throw the error so the calling component can handle it (e.g., set an error state)
        throw error;
    }
}