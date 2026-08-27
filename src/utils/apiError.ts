import axios from 'axios';

// Pulls the backend's error message out of an Axios error response, if
// there is one.
export function getApiErrorMessage(error: unknown): string | undefined {
  return axios.isAxiosError(error) ? error.response?.data?.message : undefined;
}
