import { useConvex } from 'convex/react';
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from 'sonner';
import { DownloadIcon, ExternalLinkIcon, FileTextIcon, ArchiveIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { captureException } from '@sentry/remix';
import { Spinner } from '@ui/Spinner';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  language: string | null;
  updated_at: string;
}

interface RepositoryContents {
  name: string;
  path: string;
  type: string;
  size: number | null;
  download_url: string | null;
  sha: string;
  url: string;
}

export function RepositorySelector() {
  const convex = useConvex();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [repoContents, setRepoContents] = useState<RepositoryContents[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const repositories = useQuery(api.github.getUserRepositories) || [];
  const githubConnection = useQuery(api.github.getGitHubConnection);

  const handleRepoSelect = async (repo: Repository) => {
    setSelectedRepo(repo);
    setIsLoadingContents(true);
    setRepoContents([]);
    setExpandedFolders(new Set());

    try {
      const contents = await convex.action(api.github.getRepositoryContents, {
        owner: repo.full_name.split('/')[0],
        repo: repo.name,
        path: '',
      });
      setRepoContents(contents);
    } catch (error) {
      captureException(error);
      toast.error('Failed to load repository contents');
    } finally {
      setIsLoadingContents(false);
    }
  };

  const handleItemClick = async (item: RepositoryContents) => {
    if (item.type === 'dir') {
      const path = item.path;
      const newExpandedFolders = new Set(expandedFolders);

      if (expandedFolders.has(path)) {
        newExpandedFolders.delete(path);
      } else {
        newExpandedFolders.add(path);

        try {
          const contents = await convex.action(api.github.getRepositoryContents, {
            owner: selectedRepo!.full_name.split('/')[0],
            repo: selectedRepo!.name,
            path: path,
          });

          setRepoContents(prev => {
            const filtered = prev.filter(c => !c.path.startsWith(path + '/'));
            return [...filtered, ...contents];
          });
        } catch (error) {
          captureException(error);
          toast.error('Failed to load folder contents');
        }
      }

      setExpandedFolders(newExpandedFolders);
    }
  };

  const handleImportRepo = () => {
    if (selectedRepo) {
      // TODO: Implement repository import functionality
      toast.success(`Repository "${selectedRepo.name}" import functionality coming soon!`);
    }
  };

  const handleVisitRepo = (repo: Repository) => {
    window.open(repo.html_url, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const toggleFolder = (path: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    if (expandedFolders.has(path)) {
      newExpandedFolders.delete(path);
    } else {
      newExpandedFolders.add(path);
    }
    setExpandedFolders(newExpandedFolders);
  };

  const renderFileTree = (items: RepositoryContents[], level = 0) => {
    const grouped = items.reduce((acc, item) => {
      const parts = item.path.split('/');
      const parentPath = parts.slice(0, level + 1).join('/');

      if (!acc[parentPath]) {
        acc[parentPath] = [];
      }
      acc[parentPath].push(item);
      return acc;
    }, {} as Record<string, RepositoryContents[]>);

    const sortedItems = Object.entries(grouped).sort(([a], [b]) => {
      const aItems = grouped[a];
      const bItems = grouped[b];
      const aIsDir = aItems.some(item => item.type === 'dir');
      const bIsDir = bItems.some(item => item.type === 'dir');

      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    return sortedItems.map(([path, pathItems]) => {
      const isExpanded = expandedFolders.has(path);
      const hasChildren = pathItems.some(item => item.type === 'dir') && items.some(item => item.path.startsWith(path + '/'));

      return (
        <div key={path}>
          {pathItems.map(item => (
            <div key={item.path} style={{ paddingLeft: `${level * 16}px` }}>
              <div
                className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-bolt-elements-background-depth-2 ${
                  item.type === 'dir' ? 'text-blue-600' : 'text-content-primary'
                }`}
                onClick={() => handleItemClick(item)}
              >
                {item.type === 'dir' ? (
                  <>
                    <ArchiveIcon className="h-4 w-4" />
                    <span className="text-sm">{item.name}</span>
                  </>
                ) : (
                  <>
                    <FileTextIcon className="h-4 w-4" />
                    <span className="text-sm">{item.name}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    });
  };

  if (!githubConnection) {
    return (
      <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
        <div className="p-6">
          <p className="text-center text-content-secondary">
            Connect your GitHub account to browse and import repositories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-content-primary">GitHub Repositories</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Repository List */}
          <div>
            <h3 className="mb-3 text-lg font-medium text-content-primary">Your Repositories</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRepo?.id === repo.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-content-secondary/30 bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3'
                  }`}
                  onClick={() => handleRepoSelect(repo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-content-primary truncate">{repo.name}</h4>
                      {repo.description && (
                        <p className="text-sm text-content-secondary truncate mt-1">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {repo.language && (
                          <span className="text-xs text-content-secondary">{repo.language}</span>
                        )}
                        <span className="text-xs text-content-secondary">
                          Updated {formatDate(repo.updated_at)}
                        </span>
                        {repo.private && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="neutral"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVisitRepo(repo);
                      }}
                      icon={<ExternalLinkIcon />}
                      inline
                      size="sm"
                      title="Visit repository"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repository Contents */}
          <div>
            <h3 className="mb-3 text-lg font-medium text-content-primary">
              {selectedRepo ? `Contents of ${selectedRepo.name}` : 'Select a repository'}
            </h3>

            {selectedRepo && (
              <div className="mb-4 flex gap-2">
                <Button
                  onClick={handleImportRepo}
                  icon={<DownloadIcon />}
                  size="sm"
                >
                  Import Repository
                </Button>
                <Button
                  variant="neutral"
                  onClick={() => handleVisitRepo(selectedRepo)}
                  icon={<ExternalLinkIcon />}
                  size="sm"
                >
                  View on GitHub
                </Button>
              </div>
            )}

            <div className="border rounded-lg bg-bolt-elements-background-depth-2 min-h-64">
              {isLoadingContents ? (
                <div className="flex items-center justify-center h-64">
                  <Spinner />
                </div>
              ) : selectedRepo ? (
                <div className="p-3 max-h-64 overflow-y-auto">
                  {repoContents.length === 0 ? (
                    <p className="text-center text-content-secondary py-8">
                      This repository appears to be empty.
                    </p>
                  ) : (
                    renderFileTree(repoContents)
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-content-secondary">
                  <p>Select a repository to view its contents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}