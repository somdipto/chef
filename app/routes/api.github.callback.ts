import { redirect } from '@vercel/remix';
import type { LoaderFunctionArgs } from '@vercel/remix';
import { ConvexError } from 'convex/values';
import { api } from '@convex/_generated/api';
import { getConvexClient } from '~/lib/convex';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieHeader = request.headers.get('Cookie');
  const cookies = new Map(cookieHeader?.split(';').map((c) => c.trim().split('=')) ?? []);
  const storedState = cookies.get('githubOauthState');

  if (!state || state !== storedState) {
    return redirect('/settings?error=invalid-state');
  }

  if (!code) {
    return redirect('/settings?error=missing-code');
  }

  try {
    const convex = getConvexClient();
    await convex.mutation(api.users.storeGithubAccessToken, { code });
    return redirect('/settings');
  } catch (error) {
    console.error(error);
    if (error instanceof ConvexError) {
      const errorMessage = (error.data as any)?.message || 'An unknown error occurred.';
      return redirect(`/settings?error=${encodeURIComponent(errorMessage)}`);
    }
    return redirect('/settings?error=github-auth-failed');
  }
};
