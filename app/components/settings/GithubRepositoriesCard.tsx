import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@ui/Button';
import { Spinner } from '@ui/Spinner';
import { webcontainer } from '~/lib/webcontainer';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { toast } from 'sonner';
import { useState } from 'react';

export function GithubRepositoriesCard() {
  const repositories = useQuery(api.users.getGithubRepositories);
  const [pullingRepo, setPullingRepo] = useState<string | null>(null);

  const handlePullRepository = async (repo: any) => {
    setPullingRepo(repo.full_name);
    try {
      const wc = await webcontainer;
      const dir = `/${repo.name}`;
      await wc.fs.mkdir(dir);
      await git.clone({
        fs: wc.fs,
        http,
        dir,
        url: repo.clone_url,
        // TODO: In a production environment, you might want to run your own CORS proxy.
        corsProxy: 'https://cors.isomorphic-git.org',
      });
      toast.success(`Successfully pulled ${repo.full_name}`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to pull ${repo.full_name}`);
    } finally {
      setPullingRepo(null);
    }
  };

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-content-primary">GitHub Repositories</h2>
        {repositories === undefined && (
          <div className="flex items-center gap-2">
            <Spinner />
            <p>Loading repositories...</p>
          </div>
        )}
        {repositories === null && <p>Connect your GitHub account to see your repositories.</p>}
        {repositories && repositories.length === 0 && <p>No repositories found.</p>}
        {repositories && repositories.length > 0 && (
          <ul className="space-y-2">
            {(repositories as any[]).map((repo) => (
              <li key={repo.id} className="flex items-center justify-between">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-content-link hover:underline"
                >
                  {repo.full_name}
                </a>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() => handlePullRepository(repo)}
                  disabled={pullingRepo === repo.full_name}
                >
                  {pullingRepo === repo.full_name ? <Spinner /> : 'Pull'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
