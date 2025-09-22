import { useState, useMemo } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@ui/Button';
import { Spinner } from '@ui/Spinner';
import { toast } from 'sonner';
import { workbenchStore } from '~/lib/stores/workbench.client';
import { getConvexSiteUrl } from '~/lib/convexSiteUrl';

export function GitHubCard() {
  const convex = useConvex();
  const connection = useQuery(api.github.getGithubConnection);
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
    owner_login: string;
    clone_url: string;
    html_url: string;
  }> | null>(null);

  const connected = !!connection;

  const connect = () => {
    const w = window.open('/github/connect', '_blank', 'width=500,height=700');
    const timer = setInterval(() => {
      if (w && w.closed) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 500);
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await convex.mutation(api.github.disconnectGithub, {});
      toast.success('Disconnected GitHub');
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    setLoading(true);
    try {
      const result = await convex.action(api.github.listRepos, { visibility: 'all' });
      setRepos(result);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const siteUrl = useMemo(() => getConvexSiteUrl(), []);

  const importRepo = async (fullName: string, ref?: string) => {
    setLoading(true);
    try {
      const url = new URL(siteUrl + '/github/archive');
      url.searchParams.set('full_name', fullName);
      if (ref) url.searchParams.set('ref', ref);

      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Download failed: ${response.status} ${body}`);
      }
      const blob = await response.blob();
      await workbenchStore.importZip(blob);
      toast.success('Repository imported to the workbench');
    } catch (e) {
      console.error(e);
      toast.error('Failed to import repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-2 text-xl font-semibold text-content-primary">GitHub</h2>
        <p className="mb-4 max-w-prose text-sm text-content-secondary">
          Connect your GitHub account to import an existing repository into the workbench.
        </p>

        {!connected && (
          <Button onClick={connect} disabled={loading}>
            {loading ? <Spinner /> : 'Connect GitHub'}
          </Button>
        )}

        {connected && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {connection?.avatarUrl && (
                <img src={connection.avatarUrl} className="size-6 rounded-full" />
              )}
              <div className="text-sm text-content-secondary">Connected as {connection?.username}</div>
              <div className="ml-auto flex gap-2">
                <Button variant="neutral" onClick={loadRepos} disabled={loading}>
                  {loading && !repos ? <Spinner /> : 'Load Repos'}
                </Button>
                <Button variant="danger" onClick={disconnect} disabled={loading}>
                  Disconnect
                </Button>
              </div>
            </div>

            {repos && (
              <div className="max-h-80 overflow-auto rounded border">
                {repos.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b p-2 text-sm">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-mono">{r.full_name}</span>
                      <span className="text-xs text-content-secondary">default: {r.default_branch}</span>
                    </div>
                    <div className="ml-2 flex shrink-0 gap-2">
                      <a
                        href={r.html_url}
                        className="text-content-link hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                      <Button size="sm" onClick={() => importRepo(r.full_name, r.default_branch)} disabled={loading}>
                        Import
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

