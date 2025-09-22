import { useConvex } from 'convex/react';
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from 'sonner';
import { GitHubLogoIcon, ReloadIcon, ExternalLinkIcon, TrashIcon, DownloadIcon, CheckIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { Spinner } from '@ui/Spinner';
import { captureException } from '@sentry/remix';
import { useSearchParams } from '@remix-run/react';

export function GitHubCard() {
  const convex = useConvex();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showRepositorySelector, setShowRepositorySelector] = useState(false);
  const [selectedRepositories, setSelectedRepositories] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const githubIntegration = useQuery(api.github.getGithubIntegration);
  const repositories = useQuery(api.github.getGithubRepositories);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('github_code');
      const error = searchParams.get('github_error');

      if (error) {
        toast.error(`GitHub connection failed: ${error}`);
        // Clear the error from URL
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('github_error');
          return newParams;
        });
        return;
      }

      if (code && !isConnecting) {
        setIsConnecting(true);
        try {
          const result = await convex.action(api.github.connectGithubAccount, { code });
          
          if (result.success) {
            toast.success(`Successfully connected to GitHub as ${result.username}`);
            // Auto-sync repositories after successful connection
            await handleSyncRepositories();
          } else {
            toast.error(result.error || 'Failed to connect GitHub account');
          }
        } catch (error) {
          captureException(error);
          toast.error('Failed to connect GitHub account');
        } finally {
          setIsConnecting(false);
          // Clear the code from URL
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('github_code');
            return newParams;
          });
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, convex, isConnecting, setSearchParams]);

  const handleConnectGitHub = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    
    if (!clientId) {
      toast.error('GitHub integration not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/api/github/callback`;
    const scope = 'repo,user:email';
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    window.location.href = authUrl;
  };

  const handleSyncRepositories = async () => {
    setIsSyncing(true);
    try {
      const result = await convex.action(api.github.syncGithubRepositories);
      
      if (result.success) {
        toast.success(`Successfully synced ${result.count} repositories`);
      } else {
        toast.error(result.error || 'Failed to sync repositories');
      }
    } catch (error) {
      captureException(error);
      toast.error('Failed to sync repositories');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    setIsDisconnecting(true);
    try {
      await convex.mutation(api.github.disconnectGithubAccount);
      toast.success('GitHub account disconnected');
    } catch (error) {
      captureException(error);
      toast.error('Failed to disconnect GitHub account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleImportRepositories = async () => {
    if (selectedRepositories.size === 0) {
      toast.error('Please select at least one repository to import');
      return;
    }

    setIsImporting(true);
    try {
      const reposToImport = repositories?.filter(repo => selectedRepositories.has(repo.id)) || [];
      
      for (const repo of reposToImport) {
        // Create a new chat/project for each repository
        const chatResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `I want to import my existing GitHub repository "${repo.fullName}" and continue working on it. The repository is at ${repo.htmlUrl}. Please help me set up the project structure and make it work with Chef.`
            }],
            initialPrompt: `Import and set up the GitHub repository: ${repo.fullName}`,
            githubRepo: {
              name: repo.name,
              fullName: repo.fullName,
              cloneUrl: repo.cloneUrl,
              defaultBranch: repo.defaultBranch,
              description: repo.description,
              language: repo.language,
            }
          }),
        });

        if (!chatResponse.ok) {
          throw new Error(`Failed to create project for ${repo.name}`);
        }
      }

      toast.success(`Successfully imported ${selectedRepositories.size} repository${selectedRepositories.size === 1 ? '' : 'ies'}`);
      setSelectedRepositories(new Set());
      setShowRepositorySelector(false);
      
      // Redirect to the main page to see the new projects
      window.location.href = '/';
    } catch (error) {
      captureException(error);
      toast.error('Failed to import repositories');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleRepositorySelection = (repoId: number) => {
    const newSelected = new Set(selectedRepositories);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepositories(newSelected);
  };

  const isLoading = githubIntegration === undefined;

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <GitHubLogoIcon className="size-6" />
          <h2 className="text-xl font-semibold text-content-primary">GitHub Integration</h2>
        </div>

        <p className="mb-4 max-w-prose text-sm text-content-secondary">
          Connect your GitHub account to import and work with your existing repositories.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <span className="text-sm text-content-secondary">Loading...</span>
          </div>
        ) : githubIntegration ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-bolt-elements-background-depth-2 p-4">
              <div className="flex items-center gap-3">
                {githubIntegration.avatarUrl && (
                  <img
                    src={githubIntegration.avatarUrl}
                    alt={githubIntegration.username}
                    className="size-8 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium text-content-primary">
                    {githubIntegration.username}
                  </div>
                  <div className="text-xs text-content-secondary">
                    Connected {new Date(githubIntegration.connectedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => setShowRepositorySelector(true)}
                  icon={<DownloadIcon />}
                  size="sm"
                >
                  Import Repos
                </Button>
                <Button
                  variant="neutral"
                  onClick={handleSyncRepositories}
                  disabled={isSyncing}
                  icon={isSyncing ? <Spinner /> : <ReloadIcon />}
                  size="sm"
                >
                  Sync
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDisconnectGitHub}
                  disabled={isDisconnecting}
                  icon={isDisconnecting ? <Spinner /> : <TrashIcon />}
                  size="sm"
                >
                  Disconnect
                </Button>
              </div>
            </div>

            {repositories && repositories.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium text-content-primary">
                  Your Repositories ({repositories.length})
                </h3>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {repositories.slice(0, 10).map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between rounded-lg bg-bolt-elements-background-depth-2 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-content-primary">{repo.name}</span>
                          {repo.private && (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              Private
                            </span>
                          )}
                          {repo.language && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {repo.language}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="mt-1 text-sm text-content-secondary">{repo.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-4 text-xs text-content-secondary">
                          <span>⭐ {repo.stargazersCount}</span>
                          <span>🍴 {repo.forksCount}</span>
                          <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="neutral"
                        size="sm"
                        icon={<ExternalLinkIcon />}
                        onClick={() => window.open(repo.htmlUrl, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  ))}

                {/* Repository Import Selector */}
                {showRepositorySelector && (
                  <div className="mt-4 rounded-lg border bg-bolt-elements-background-depth-2 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-medium text-content-primary">Select Repositories to Import</h4>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => {
                          setShowRepositorySelector(false);
                          setSelectedRepositories(new Set());
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="mb-3 text-sm text-content-secondary">
                      Selected repositories will be imported as new Chef projects.
                    </p>
                    
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {repositories.map((repo) => (
                        <div
                          key={repo.id}
                          className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedRepositories.has(repo.id)
                              ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                              : 'bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2'
                          }`}
                          onClick={() => toggleRepositorySelection(repo.id)}
                        >
                          <div className={`flex-shrink-0 size-4 rounded border-2 flex items-center justify-center ${
                            selectedRepositories.has(repo.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedRepositories.has(repo.id) && (
                              <CheckIcon className="size-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-content-primary">{repo.name}</span>
                              {repo.private && (
                                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                  Private
                                </span>
                              )}
                              {repo.language && (
                                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {repo.language}
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="mt-1 text-sm text-content-secondary">{repo.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedRepositories.size > 0 && (
                      <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                        <span className="text-sm text-content-secondary">
                          {selectedRepositories.size} repository{selectedRepositories.size === 1 ? '' : 'ies'} selected
                        </span>
                        <Button
                          onClick={handleImportRepositories}
                          disabled={isImporting}
                          icon={isImporting ? <Spinner /> : <DownloadIcon />}
                        >
                          {isImporting ? 'Importing...' : 'Import Selected'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                  {repositories.length > 10 && (
                    <div className="p-3 text-center text-sm text-content-secondary">
                      ... and {repositories.length - 10} more repositories
                    </div>
                  )}
                </div>
                {githubIntegration.lastSyncAt && (
                  <p className="mt-2 text-xs text-content-secondary">
                    Last synced: {new Date(githubIntegration.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={handleConnectGitHub}
            disabled={isConnecting}
            icon={isConnecting ? <Spinner /> : <GitHubLogoIcon />}
            className="w-full"
          >
            {isConnecting ? 'Connecting...' : 'Connect GitHub Account'}
          </Button>
        )}
      </div>
    </div>
  );
}