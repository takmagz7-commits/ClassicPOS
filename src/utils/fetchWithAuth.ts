import { handleAuthError, isAuthError } from './authErrorHandler';

export interface FetchOptions extends RequestInit {
  skipAuthErrorHandling?: boolean;
}

export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuthErrorHandling, ...fetchOptions } = options;
  
  const response = await fetch(url, fetchOptions);
  
  if (!skipAuthErrorHandling && isAuthError(response.status)) {
    handleAuthError();
  }
  
  return response;
}

export async function handleAuthResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    if (isAuthError(response.status)) {
      handleAuthError();
      return null as any;
    }
    
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'An error occurred');
  }
  
  if (response.status === 204) {
    return null as any;
  }
  
  return response.json();
}
