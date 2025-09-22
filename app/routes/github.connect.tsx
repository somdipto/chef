import type { LoaderFunctionArgs } from '@vercel/remix';
import { redirect } from '@vercel/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const origin = url.origin;
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Response('Missing GITHUB_CLIENT_ID', { status: 500 });
  }
  const state = crypto.randomUUID();
  const scopes = ['repo', 'read:user'];
  const redirectUri = `${origin}/github/callback`;
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', state);
  return redirect(authUrl.toString());
}

export default function GithubConnect() {
  return null;
}

