import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';
import type { MetaFunction } from '@vercel/remix';
import { Spinner } from '@ui/Spinner';

export const meta: MetaFunction = () => {
  return [{ title: 'Loading | Chef' }];
};

export default function GitHubConnect() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

    if (!clientId) {
      console.error('GitHub client ID not configured');
      window.close();
      return;
    }

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}&client_id=${clientId}&scope=repo,user:email&state=${state}`;
    window.location.href = authUrl;
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f9f7ee' }}>
      <Spinner />
    </div>
  );
}