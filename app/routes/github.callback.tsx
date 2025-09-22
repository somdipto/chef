import { json, type LoaderFunctionArgs, redirect } from '@vercel/remix';
import { api } from '@convex/_generated/api';
import { getConvexSiteUrl } from '~/lib/convexSiteUrl';
import { createClient } from 'convex/react';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error) {
    return redirect('/settings?github_error=' + encodeURIComponent(error));
  }
  if (!code) {
    return redirect('/settings?github_error=' + encodeURIComponent('No code provided'));
  }

  // We can't use Convex React client on the server easily; call our Convex action via HTTP fetch to site URL
  const redirectUri = url.origin + '/github/callback';
  const convexSiteUrl = getConvexSiteUrl();
  // Forward the WorkOS auth token from the browser session if present; not available here. We'll rely on Convex session cookie.
  try {
    const resp = await fetch(convexSiteUrl + '/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'github:exchangeCode',
        args: { code, redirectUri },
      }),
      credentials: 'include',
    });
    if (!resp.ok) {
      const body = await resp.text();
      return redirect('/settings?github_error=' + encodeURIComponent('Exchange failed: ' + body));
    }
  } catch (e: any) {
    return redirect('/settings?github_error=' + encodeURIComponent(String(e)));
  }
  return redirect('/settings?github=connected');
}

