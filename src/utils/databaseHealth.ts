import { getApiBaseUrl } from './platformConfig';

export interface DatabaseHealthStatus {
  ready: boolean;
  status: string;
  message: string;
}

export async function checkDatabaseHealth(maxRetries = 3, retryDelay = 1000): Promise<DatabaseHealthStatus> {
  const API_BASE_URL = getApiBaseUrl();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/health/db`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.ready) {
        return {
          ready: true,
          status: data.status,
          message: data.message,
        };
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        return {
          ready: false,
          status: data.status || 'error',
          message: data.message || 'Database is not ready',
        };
      }
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        return {
          ready: false,
          status: 'error',
          message: 'Failed to connect to server. Please check your connection.',
        };
      }
    }
  }

  return {
    ready: false,
    status: 'error',
    message: 'Database health check failed after retries',
  };
}

export async function ensureDatabaseReady(
  onStatusUpdate?: (message: string) => void
): Promise<boolean> {
  if (onStatusUpdate) {
    onStatusUpdate('Connecting to database...');
  }

  const health = await checkDatabaseHealth(3, 1500);

  if (!health.ready) {
    if (onStatusUpdate) {
      onStatusUpdate(health.message);
    }
    return false;
  }

  return true;
}
