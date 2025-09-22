import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

export function GitHubCallback() {
  const exchange = useMutation(api.github.exchangeCode);
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) {
      window.location.replace('/settings');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    (async () => {
      try {
        await exchange({ code, redirectUri });
      } catch (e) {
        console.error('GitHub exchange failed', e);
      } finally {
        window.location.replace('/settings');
      }
    })();
  }, [exchange]);
  return null;
}

