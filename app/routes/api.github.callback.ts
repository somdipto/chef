import type { LoaderFunctionArgs } from '@vercel/remix';
import { redirect } from '@vercel/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    // Handle OAuth error
    return redirect(`/settings?github_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return redirect('/settings?github_error=no_code');
  }

  // Redirect to settings with the code - the client will handle the actual OAuth exchange
  return redirect(`/settings?github_code=${encodeURIComponent(code)}`);
}