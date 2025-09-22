import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';
import type { MetaFunction } from '@vercel/remix';
import { Spinner } from '@ui/Spinner';

export const meta: MetaFunction = () => {
  return [{ title: 'Loading | Chef' }];
};

type GitHubTokenResponse =
  | {
      accessToken: string;
      user: {
        id: number;
        login: string;
        name: string | null;
        avatar_url: string;
        email: string | null;
      };
    }
  | {
      error: string;
    };

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('GitHub OAuth error:', error);
      window.close();
      return;
    }

    if (!code) {
      window.close();
      return;
    }

    // Exchange the code for a token
    fetch('/api/github/callback?' + searchParams.toString())
      .then((response) => response.json())
      .then((data: unknown) => {
        const tokenData = data as GitHubTokenResponse;

        if ('error' in tokenData) {
          console.error('Failed to exchange code for token:', tokenData.error);
          window.close();
        } else {
          // Store GitHub token and user info in localStorage
          localStorage.setItem('githubAccessToken', tokenData.accessToken);
          localStorage.setItem('githubUser', JSON.stringify(tokenData.user));

          // Send message to parent window (if this is a popup)
          if (window.opener) {
            window.opener.postMessage({
              type: 'github-oauth-success',
              accessToken: tokenData.accessToken,
              user: tokenData.user
            }, window.location.origin);
          }

          window.close();
        }
      })
      .catch((error) => {
        console.error('Error exchanging code:', error);
        window.close();
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}