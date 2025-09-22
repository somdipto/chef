import type { LoaderFunctionArgs } from '@vercel/remix';
import { redirect } from '@vercel/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/auth/github/callback`;
  const clientId = process.env.GITHUB_CLIENT_ID as string;
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
    state,
  });
  return redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

export default function _() {
  return null;
}

