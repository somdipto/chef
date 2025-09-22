import { useEffect } from 'react';
import { useConvex } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { MetaFunction } from '@vercel/remix';
import { Spinner } from '@ui/Spinner';

export const meta: MetaFunction = () => {
  return [{ title: 'Finalizing GitHub Connection | Chef' }];
};

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

export default function GithubCallback() {
  const convex = useConvex();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = sessionStorage.getItem('github_oauth_state');
    const redirectUri = window.location.origin + '/github/callback';

    async function finalize() {
      try {
        if (!code || !state || state !== expectedState) {
          window.close();
          return;
        }
        if (!clientId) {
          console.error('Missing GitHub OAuth env vars');
          window.close();
          return;
        }
        const token = await convex.action(api.github.exchangeCodeForToken, {
          code,
          redirectUri,
        });

        // Fetch user profile
        const profileResp = await fetch('https://api.github.com/user', {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token.access_token}`,
          },
        });
        if (!profileResp.ok) {
          throw new Error('Failed to fetch GitHub profile');
        }
        const profile = (await profileResp.json()) as { login: string; avatar_url?: string };

        await convex.mutation(api.github.saveGithubAuth, {
          accessToken: token.access_token,
          username: profile.login,
          avatarUrl: profile.avatar_url,
        });
      } catch (e) {
        console.error(e);
      } finally {
        window.close();
      }
    }

    void finalize();
  }, [convex]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

