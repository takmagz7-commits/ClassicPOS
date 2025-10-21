import { getApiEndpoint } from './tableMapping';
import { handleAuthError, isAuthError } from '@/utils/authErrorHandler';
import { getApiBaseUrl } from '@/utils/platformConfig';

const API_BASE_URL = getApiBaseUrl();

export interface DbRecord {
  [key: string]: any;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    if (isAuthError(response.status)) {
      handleAuthError();
      return null;
    }
    
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'An error occurred');
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

export const insert = async <T extends DbRecord>(
  table: string,
  data: T
): Promise<T> => {
  const endpoint = getApiEndpoint(table);
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const insertMany = async <T extends DbRecord>(
  table: string,
  records: T[]
): Promise<void> => {
  if (records.length === 0) return;
  
  for (const record of records) {
    await insert(table, record);
  }
};

export const getAll = async <T>(table: string): Promise<T[]> => {
  const endpoint = getApiEndpoint(table);
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    credentials: 'include',
  });
  const result = await handleResponse(response);
  return result || [];
};

export const getById = async <T>(table: string, id: string | number): Promise<T | undefined> => {
  const endpoint = getApiEndpoint(table);
  const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
    credentials: 'include',
  });
  if (response.status === 404) {
    return undefined;
  }
  return handleResponse(response);
};

export const update = async <T extends DbRecord>(
  table: string,
  id: string | number,
  data: Partial<T>
): Promise<T> => {
  const endpoint = getApiEndpoint(table);
  const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const remove = async (table: string, id: string | number): Promise<void> => {
  const endpoint = getApiEndpoint(table);
  const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse(response);
};

export const query = async <T>(endpoint: string, params: any[] = []): Promise<T[]> => {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, params }),
  });
  const result = await handleResponse(response);
  return result || [];
};

export const queryOne = async <T>(endpoint: string, params: any[] = []): Promise<T | undefined> => {
  const results = await query<T>(endpoint, params);
  return results[0];
};

export const execute = async (endpoint: string, params: any[] = []): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/execute`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, params }),
  });
  return handleResponse(response);
};

export const count = async (table: string, whereClause?: string, params: any[] = []): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/${table}/count`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whereClause, params }),
  });
  const result = await handleResponse(response);
  return result ? result.count : 0;
};

export const exists = async (table: string, id: string | number): Promise<boolean> => {
  const item = await getById(table, id);
  return item !== undefined;
};

export const getSetting = async (key: string, defaultValue: string = ''): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
    credentials: 'include',
  });
  if (response.status === 404) {
    return defaultValue;
  }
  const result = await handleResponse(response);
  return result ? (result.value || defaultValue) : defaultValue;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  await handleResponse(response);
};

export const transaction = async <T>(callback: () => Promise<T>): Promise<T> => {
  return callback();
};
