import { env } from '$env/dynamic/public';

// The webapp (Keycloak + angular-auth-oidc-client) stores its OIDC session under this key.
// The value is `${configId}-${clientId}` => '0-heart-webapp'.
const SESSION_KEY = '0-heart-webapp';
// Public Keycloak client used by the webapp. Refresh is a public-client grant (no secret).
const CLIENT_ID = env.PUBLIC_OIDC_CLIENT_ID ?? 'heart-webapp';
// Refresh proactively once the access token has less than this many ms of life left.
const EXPIRY_SKEW_MS = 30_000;

function readSession(): any | null {
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (e) {
		return null;
	}
}

function writeSession(obj: any): void {
	try {
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
	} catch (e) {
		// best-effort: if we can't persist, the refreshed token is still returned in-memory
	}
}

function decodeJwtExp(jwt?: string | null): number | null {
	if (!jwt || typeof jwt !== 'string') return null;
	try {
		const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
		return typeof payload.exp === 'number' ? payload.exp : null;
	} catch (e) {
		return null;
	}
}

// Access-token expiry as an epoch-ms value (or null if unknown).
function getExpiryMs(parsed: any): number | null {
	// angular-auth-oidc-client stores this as epoch ms.
	if (parsed?.access_token_expires_at) return Number(parsed.access_token_expires_at);
	const exp = decodeJwtExp(parsed?.authnResult?.access_token ?? parsed?.authzData);
	return exp ? exp * 1000 : null;
}

function getTokenEndpoint(parsed: any): string | null {
	const ep = parsed?.authWellKnownEndPoints?.tokenEndpoint;
	if (ep) return ep;
	const iss = parsed?.authWellKnownEndPoints?.issuer;
	if (iss) return `${String(iss).replace(/\/$/, '')}/protocol/openid-connect/token`;
	return null;
}

// Extract authentication token from sessionStorage key '0-heart-webapp'.
// Supports multiple token locations within the stored JSON object.
// Falls back to PUBLIC_AUTH_TOKEN env var for local testing (e.g. THEBESTOF).
export function extractTokenFromSession(): string | null {
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		if (!raw) return env.PUBLIC_AUTH_TOKEN ?? null;
		try {
			const parsed = JSON.parse(raw);
			// Try authzData field
			if (parsed.authzData) {
				return parsed.authzData;
			}
			// Try authnResult.access_token
			if (parsed.authnResult?.access_token) {
				return String(parsed.authnResult.access_token);
			}
			return env.PUBLIC_AUTH_TOKEN ?? null;
		} catch (e) {
			// If not JSON, treat raw value as token
			return raw;
		}
	} catch (e) {
		return env.PUBLIC_AUTH_TOKEN ?? null;
	}
}

// In-flight refresh guard so concurrent API calls trigger at most one token request.
let refreshInFlight: Promise<string | null> | null = null;

// Exchange the stored refresh_token for a fresh access_token via the Keycloak token
// endpoint (public-client refresh grant). Updates sessionStorage so later reads — and the
// webapp tab, if same context — see the new token. Returns the new access token or null.
async function refreshAccessToken(): Promise<string | null> {
	if (refreshInFlight) return refreshInFlight;
	refreshInFlight = (async () => {
		const parsed = readSession();
		const refreshToken = parsed?.authnResult?.refresh_token;
		const tokenEndpoint = getTokenEndpoint(parsed);
		if (!parsed || !refreshToken || !tokenEndpoint) return null;
		try {
			const body = new URLSearchParams({
				grant_type: 'refresh_token',
				client_id: CLIENT_ID,
				refresh_token: refreshToken
			});
			const res = await fetch(tokenEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body
			});
			if (!res.ok) return null;
			const data = await res.json();
			if (!data?.access_token) return null;

			// Persist the rotated tokens back into the session blob.
			parsed.authnResult = { ...parsed.authnResult, ...data };
			parsed.authzData = data.access_token;
			const exp = decodeJwtExp(data.access_token);
			parsed.access_token_expires_at = exp
				? exp * 1000
				: data.expires_in
					? Date.now() + Number(data.expires_in) * 1000
					: parsed.access_token_expires_at;
			writeSession(parsed);
			return data.access_token as string;
		} catch (e) {
			return null;
		}
	})();
	try {
		return await refreshInFlight;
	} finally {
		refreshInFlight = null;
	}
}

// Return a token that is valid right now, refreshing proactively if it is expired or about
// to expire. Falls back to the static token when there is no OIDC session (local testing).
async function getValidToken(): Promise<string | null> {
	const parsed = readSession();
	if (!parsed) return env.PUBLIC_AUTH_TOKEN ?? null;

	const expiry = getExpiryMs(parsed);
	const canRefresh = !!parsed?.authnResult?.refresh_token && !!getTokenEndpoint(parsed);
	if (expiry && canRefresh && Date.now() >= expiry - EXPIRY_SKEW_MS) {
		const refreshed = await refreshAccessToken();
		if (refreshed) return refreshed;
	}
	return extractTokenFromSession();
}

// Drop-in replacement for fetch() against the backend proxy routes. Attaches a valid Bearer
// token (refreshing first if needed) and, on a 401, refreshes once and retries — this is what
// makes the Visual Explainer survive past the ~15 min access-token lifetime without the user
// having to close and reopen the tab.
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
	const token = await getValidToken();
	const headers = new Headers(init.headers ?? {});
	if (token) headers.set('Authorization', `Bearer ${token}`);

	let res = await fetch(input, { ...init, headers });

	if (res.status === 401) {
		const refreshed = await refreshAccessToken();
		if (refreshed) {
			headers.set('Authorization', `Bearer ${refreshed}`);
			res = await fetch(input, { ...init, headers });
		}
	}
	return res;
}
