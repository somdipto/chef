import { useEffect } from 'react';
import type { MetaFunction } from '@vercel/remix';
import { Spinner } from '@ui/Spinner';

export const meta: MetaFunction = () => {
  return [{ title: 'Connecting to GitHub | Chef' }];
};

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

export default function GithubConnect() {
  useEffect(() => {
    if (!clientId) {
      console.error('Missing VITE_GITHUB_CLIENT_ID');
      window.close();
      return;
    }
    const redirectUri = window.location.origin + '/github/callback';
    const state = crypto.randomUUID();
    sessionStorage.setItem('github_oauth_state', state);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'repo');
    window.location.href = url.toString();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

