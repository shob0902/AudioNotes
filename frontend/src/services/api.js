/**
 * Thin fetch wrapper around the backend API. This is the only file that
 * knows the API's base URL or request/response shape — components and
 * hooks call these functions instead of using fetch() directly.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/** Extracts a human-readable message from an error response body. Routes
 * that validate manually (e.g. upload) raise a plain string `detail`.
 * Pydantic's automatic request validation (e.g. signup's email/password
 * schema) instead returns `detail` as an array of {msg, loc, type} — used
 * by the new signup form, so both shapes need handling here. */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // response wasn't JSON — fall through to the generic message below
  }
  return `Request failed (${response.status}). Please try again.`;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Set by AuthContext once it knows the current token / how to react to a
// rejected one. Kept as plain module state (not React state) so this file
// can stay a plain set of functions rather than a hook.
let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401 && authToken) {
    // We sent a token and it was rejected (expired/invalid) — the session
    // is over. Let AuthContext clear it and redirect to /login instead of
    // this call's caller showing a confusing generic error inline. (A 401
    // from /auth/login itself — wrong password — never reaches here with
    // authToken set, since login is unauthenticated by design.)
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

function requestJson(path, options = {}) {
  return request(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

// --- Auth ------------------------------------------------------------------

export function signup(email, password) {
  return requestJson("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email, password) {
  return requestJson("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function getCurrentUser() {
  return request("/auth/me");
}

// --- Notes -------------------------------------------------------------------

/** @param {File} file */
export function uploadNote(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/notes", { method: "POST", body: formData });
}

export function listNotes({ limit = 50, offset = 0 } = {}) {
  return request(`/notes?limit=${limit}&offset=${offset}`);
}

export function getNote(id) {
  return request(`/notes/${id}`);
}

export function getNoteStatus(id) {
  return request(`/notes/${id}/status`);
}

export function retryNote(id) {
  return request(`/notes/${id}/retry`, { method: "POST" });
}

export function deleteNote(id) {
  return request(`/notes/${id}`, { method: "DELETE" });
}
