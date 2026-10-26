import { env as privateEnv } from '$env/dynamic/private';
import { error, type RequestHandler } from '@sveltejs/kit';

const backendUrl = privateEnv.STATIC_BACKEND_URL;
const appEnv = privateEnv.APP_ENV;

export const POST: RequestHandler = async ({ request, cookies, params }) => {
    try {
        if (backendUrl === undefined) {
            error(500, "Please set STATIC_BACKEND_URL in .env")
        }
        const rawBody = await request.text()

        const counterfactualPath = appEnv === 'prod'
            ? '/api/ve/extended-counterfactuals' : '/CF';

         // Forward incoming Authorization header (if present) to backend
        const incomingAuth = request.headers.get('authorization');
        const forwardHeaders: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (incomingAuth) forwardHeaders['Authorization'] = incomingAuth;

        const res = await fetch(`${backendUrl}${counterfactualPath}`, {
            method: 'POST',
            body: rawBody,
            headers: forwardHeaders
        })

        // copy the response headers over
        const headers = new Headers(res.headers);
        // delete content-encoding.
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