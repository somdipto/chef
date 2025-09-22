import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';
import { Spinner } from '@ui/Spinner';
import { useConvex } from 'convex/react';
import { api } from '@convex/_generated/api';

export default function GithubCallback() {
  const convex = useConvex();
  const [params] = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = params.get('code');
      const error = params.get('error');
      if (error) {
        window.location.replace('/settings?githubError=' + encodeURIComponent(error));
        return;
      }
      if (!code) {
        window.location.replace('/settings?githubError=missing_code');
        return;
      }
      const origin = window.location.origin;
      const { accessToken, username, avatarUrl } = await convex.action(api.github.exchangeCode, {
        code,
        redirectUri: `${origin}/github/callback`,
      });
      await convex.mutation(api.github.saveAccessToken, { accessToken, username, avatarUrl });
      window.location.replace('/settings');
    };
    run();
  }, [convex, params]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f9f7ee' }}>
      <Spinner />
    </div>
  );
}

