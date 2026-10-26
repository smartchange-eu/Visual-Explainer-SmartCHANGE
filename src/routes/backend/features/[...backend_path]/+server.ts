import { env as privateEnv } from '$env/dynamic/private';
import { error, type RequestHandler } from '@sveltejs/kit';

const backendUrl = privateEnv.STATIC_BACKEND_URL;
const appEnv = privateEnv.APP_ENV;

export const GET: RequestHandler = async ({ request, cookies, params, url }) => {
    try {
        if (backendUrl === undefined) {
            error(500, "Please set STATIC_BACKEND_URL in .env")
        }
        const path = params.backend_path;
        // Forward incoming Authorization header (if present) to backend
        const incomingAuth = request.headers.get('authorization');
        const forwardHeaders: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (incomingAuth) forwardHeaders['Authorization'] = incomingAuth;

        const featuresPath = appEnv === 'prod'
            ? `/api/ve/features/${path}` : `/features/${path}`;

        const res = await fetch(
            `${backendUrl}${featuresPath}`,
            {
                method: 'GET',
                headers: forwardHeaders
            }
        );

        // copy the response headers over
        const headers = new Headers(res.headers);
        // delete content-encoding.Z
        headers.delete('content-encoding');

        return new Response(res.body, {
            headers,
            status: res.status,
            statusText: res.statusText,
        });
    } catch (e: unknown) {
        console.error(e);
        error(500, (e instanceof Error) ? e.message : 'Unknown error');
    }
};
