import { useEffect, useMemo, useState } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@ui/Button';
import { Spinner } from '@ui/Spinner';
import { toast } from 'sonner';
import { getConvexSiteUrl } from '~/lib/convexSiteUrl';
import { useConvexSessionIdOrNullOrLoading } from '~/lib/stores/sessionId';

export function GitHubConnectCard() {
  const convex = useConvex();
  const connection = useQuery(api.github.getConnection);
  const sessionId = useConvexSessionIdOrNullOrLoading();
  const [repos, setRepos] = useState<Array<Repo> | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const clientId = (import.meta as any).env.VITE_GITHUB_CLIENT_ID as string | undefined;

  const connectUrl = useMemo(() => {
    if (!clientId) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'repo',
      redirect_uri: `${window.location.origin}/github/callback`,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, [clientId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('github') === 'connected') {
      toast.success('GitHub connected');
      url.searchParams.delete('github');
      window.history.replaceState({}, '', url.toString());
    }
    const error = url.searchParams.get('github_error');
    if (error) {
      toast.error(`GitHub error: ${decodeURIComponent(error)}`);
      url.searchParams.delete('github_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleDisconnect = async () => {
    try {
      await convex.mutation(api.github.disconnect);
      toast.success('Disconnected from GitHub');
      setRepos(null);
    } catch (e) {
      toast.error('Failed to disconnect');
    }
  };

  const handleListRepos = async () => {
    setLoadingRepos(true);
    try {
      const result = await convex.action(api.github.listRepos, { perPage: 100 });
      setRepos(result);
    } catch (e) {
      toast.error('Failed to list repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleImportRepo = async (repo: Repo) => {
    try {
      if (!sessionId) {
        toast.error('Session not ready');
        return;
      }
      const siteUrl = getConvexSiteUrl();
      const response = await fetch(
        `${siteUrl}/github/repoZip?sessionId=${sessionId}&owner=${encodeURIComponent(repo.owner.login)}&repo=${encodeURIComponent(repo.name)}&ref=${encodeURIComponent(repo.default_branch)}`,
      );
      if (!response.ok) {
        const text = await response.text();
        toast.error(`Failed to download repo: ${text}`);
        return;
      }
      const blob = await response.blob();
      // For now, just download the zip to user; integrating unzip into webcontainer can be a follow-up.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${repo.full_name.replace('/', '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success('Repository zip downloaded');
    } catch (e) {
      toast.error('Failed to import repository');
    }
  };

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-2 text-xl font-semibold text-content-primary">GitHub</h2>
        <p className="mb-4 max-w-prose text-sm text-content-secondary">
          Connect your GitHub account to browse and import repositories.
        </p>

        {!connection && connection !== undefined && (
          <div className="flex items-center gap-2">
            {connectUrl ? (
              <a href={connectUrl}>
                <Button>Connect GitHub</Button>
              </a>
            ) : (
              <Button disabled tip="Missing VITE_GITHUB_CLIENT_ID env var">Connect GitHub</Button>
            )}
          </div>
        )}

        {connection === undefined && <div className="h-[40px] w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />}

        {connection && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={connection.avatarUrl} className="size-8 rounded-full" />
              <div className="text-sm">Connected as {connection.login}</div>
              <div className="ml-auto flex gap-2">
                <Button variant="neutral" onClick={handleListRepos} icon={loadingRepos ? <Spinner /> : undefined}>
                  {loadingRepos ? 'Loading…' : 'List Repositories'}
                </Button>
                <Button variant="danger" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>

            {repos && (
              <div className="max-h-80 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Repository</th>
                      <th className="p-2">Private</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repos.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">
                          <a className="text-content-link hover:underline" href={r.html_url} target="_blank" rel="noreferrer">
                            {r.full_name}
                          </a>
                        </td>
                        <td className="p-2">{r.private ? 'Yes' : 'No'}</td>
                        <td className="p-2">
                          <Button size="sm" onClick={() => handleImportRepo(r)}>
                            Download Zip
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Repo = {
  id: string | number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner: { login: string };
};

