import axios from 'axios';

// Pulls the backend's error message out of an Axios error response, if
// there is one.
export function getApiErrorMessage(error: unknown): string | undefined {
  return axios.isAxiosError(error) ? error.response?.data?.message : undefined;
}

// Whether trying again could help: true for network failures and server-side
// errors, false when the backend refused the request.
export function isRetryableApiError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return true;
  return error.response.status >= 500;
}
