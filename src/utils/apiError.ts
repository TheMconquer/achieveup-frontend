import axios from 'axios';

// Pulls the backend's error message out of an Axios error response, if
// there is one.
export function getApiErrorMessage(error: unknown): string | undefined {
  return axios.isAxiosError(error) ? error.response?.data?.message : undefined;
}

export const CANVAS_UNAVAILABLE_MESSAGE =
  "Couldn't reach Canvas to load your courses. Canvas may be down; please try again in a few minutes.";

// True when the request failed because Canvas (or the backend's link to it)
// is down: no response at all, or a 5xx from the backend's Canvas proxy.
export function isCanvasUnavailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}
