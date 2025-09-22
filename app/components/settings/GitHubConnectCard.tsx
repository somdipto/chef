import { useEffect, useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';

export function GitHubConnectCard() {
  const status = useQuery(api.github.isConnected);
  const disconnect = useMutation(api.github.disconnect);
  const listRepos = useAction(api.github.listRepos);
  const [repos, setRepos] = useState<Array<{ full_name: string; default_branch: string }>>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const redirectUri = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/auth/github/callback`;
  }, []);

  const startUrl = useMemo(() => {
    const params = new URLSearchParams({ redirect_uri: redirectUri });
    return `/auth/github/start?${params.toString()}`;
  }, [redirectUri]);

  useEffect(() => {
    if (status?.connected) {
      (async () => {
        setLoadingRepos(true);
        try {
          const r = await listRepos({});
          setRepos(r.map((x: any) => ({ full_name: x.full_name, default_branch: x.default_branch })));
        } finally {
          setLoadingRepos(false);
        }
      })();
    }
  }, [status?.connected, listRepos]);

  const handleImport = async (fullName: string, ref: string) => {
    const [owner, repo] = fullName.split('/');
    const url = new URL('/github/zipball', import.meta.env.VITE_CONVEX_URL || window.location.origin);
    url.searchParams.set('owner', owner);
    url.searchParams.set('repo', repo);
    url.searchParams.set('ref', ref);
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      alert('Failed to fetch repo');
      return;
    }
    const blob = await resp.blob();
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(blob);
    // Heuristic: zip contains a single root folder named owner-repo-<sha>
    const root = Object.keys(zip.files).sort()[0];
    const entries = Object.values(zip.files);
    const { webcontainer } = await import('~/lib/webcontainer');
    const container = await webcontainer.get();
    for (const entry of entries) {
      if (entry.dir) continue;
      const pathInRepo = entry.name.startsWith(root) ? entry.name.slice(root.length) : entry.name;
      if (!pathInRepo) continue;
      const content = await entry.async('string');
      await container.fs.mkdir('/' + pathInRepo.split('/').slice(0, -1).join('/'), { recursive: true } as any);
      await container.fs.writeFile('/' + pathInRepo, content);
    }
    alert('Repository imported into your workspace');
  };

  if (!status) return null;

  return (
    <div className="rounded-lg border border-neutral-3 bg-neutral-1/50 p-4 dark:border-neutral-700 dark:bg-neutral-11">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">GitHub</h3>
          <p className="text-sm text-content-secondary">
            Connect your GitHub account to import existing repositories.
          </p>
        </div>
        {!status.connected ? (
          <a href={startUrl} className="rounded bg-black px-3 py-2 text-white dark:bg-white dark:text-black">
            Connect GitHub
          </a>
        ) : (
          <button
            onClick={() => disconnect()}
            className="rounded border px-3 py-2 text-sm hover:bg-neutral-2 dark:border-neutral-700 dark:hover:bg-neutral-10"
          >
            Disconnect
          </button>
        )}
      </div>

      {status.connected && (
        <div>
          <div className="mb-2 text-sm text-content-secondary">
            Connected{status.login ? ` as ${status.login}` : ''}
          </div>
          <div className="mb-2 font-medium">Your repositories</div>
          {loadingRepos ? (
            <div className="text-sm text-content-secondary">Loading…</div>
          ) : repos.length === 0 ? (
            <div className="text-sm text-content-secondary">No repositories found.</div>
          ) : (
            <ul className="max-h-64 divide-y overflow-auto rounded border dark:divide-neutral-800 dark:border-neutral-800">
              {repos.map((r) => (
                <li key={r.full_name} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-sm">{r.full_name}</span>
                  <button
                    onClick={() => handleImport(r.full_name, r.default_branch)}
                    className="rounded bg-bolt-elements-button-primary-background px-2 py-1 text-sm text-white dark:text-black"
                  >
                    Import
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

