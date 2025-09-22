import { useQuery, useConvex } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@ui/Button';
import { useEffect, useState } from 'react';
import { Spinner } from '@ui/Spinner';
import JSZip from 'jszip';
import { webcontainer } from '~/lib/webcontainer';
import { WORK_DIR } from 'chef-agent/constants';
import { path } from 'chef-agent/utils/path';

export function GithubConnectCard() {
  const convex = useConvex();
  const connection = useQuery(api.github.getConnection);
  const [repos, setRepos] = useState<Array<{ id: number; full_name: string }>>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (connection?.connected) {
        setLoadingRepos(true);
        try {
          const list = await convex.action(api.github.listRepos, {});
          setRepos(list.map((r) => ({ id: r.id, full_name: r.full_name })));
        } finally {
          setLoadingRepos(false);
        }
      } else {
        setRepos([]);
      }
    };
    load();
  }, [connection?.connected, convex]);

  const connect = () => {
    window.location.href = '/github/connect';
  };

  const disconnect = async () => {
    await convex.mutation(api.github.disconnect, {});
  };

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-2 text-xl font-semibold text-content-primary">GitHub</h2>
        {!connection && <div className="h-[78px] w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />}
        {connection && !connection.connected && (
          <div className="flex items-center gap-2 py-1.5">
            <Button onClick={connect}>Connect GitHub</Button>
          </div>
        )}
        {connection && connection.connected && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {connection.avatarUrl && (
                <img src={connection.avatarUrl} className="size-8 rounded-full" alt="avatar" />
              )}
              <div className="text-sm text-content-secondary">Connected as {connection.username ?? 'GitHub user'}</div>
              <Button variant="danger" onClick={disconnect} inline>
                Disconnect
              </Button>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-content-primary">Your repositories</div>
              {loadingRepos ? (
                <Spinner />
              ) : repos.length === 0 ? (
                <div className="text-sm text-content-secondary">No repositories found.</div>
              ) : (
                <ul className="max-h-60 divide-y overflow-auto rounded border">
                  {repos.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 p-2">
                      <span className="truncate text-sm">{r.full_name}</span>
                      <Button
                        onClick={() => importRepo(r.full_name)}
                        variant="neutral"
                        inline
                      >
                        Import
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  async function importRepo(fullName: string) {
    const wc = await webcontainer;
    // Download archive bytes from Convex
    const bytes = await convex.action(api.github.downloadRepoArchive, { fullName });
    const zip = await JSZip.loadAsync(bytes as unknown as ArrayBuffer);
    // Determine root folder prefix
    let rootPrefix = '';
    zip.forEach((relativePath) => {
      if (!rootPrefix) {
        const parts = relativePath.split('/');
        if (parts.length > 1) {
          rootPrefix = parts[0] + '/';
        }
      }
    });
    const ensureDir = async (dirPath: string) => {
      try {
        await wc.fs.mkdir(dirPath, { recursive: true } as any);
      } catch (e) {
        // ignore if exists
      }
    };
    const writes: Array<Promise<unknown>> = [];
    await Promise.all(
      Object.keys(zip.files).map(async (filePath) => {
        const entry = zip.files[filePath];
        if (!entry || entry.dir) return;
        // Strip root folder
        const relative = rootPrefix && filePath.startsWith(rootPrefix) ? filePath.slice(rootPrefix.length) : filePath;
        if (!relative) return;
        const targetPath = path.join(WORK_DIR, relative);
        const dir = path.dirname(targetPath);
        await ensureDir(dir);
        const content = await entry.async('uint8array');
        writes.push(wc.fs.writeFile(targetPath, content));
      }),
    );
    await Promise.all(writes);
    // Simple feedback
    alert(`Imported ${fullName} into workspace.`);
  }
}

