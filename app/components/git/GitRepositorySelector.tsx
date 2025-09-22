import { useState } from 'react';
import { GitHubLogoIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { Menu, MenuItem } from '@ui/Menu';
import { toast } from 'sonner';

interface GitRepository {
  _id: string;
  name: string;
  url: string;
  branch?: string;
  isPrivate: boolean;
}

interface GitRepositorySelectorProps {
  onSelectRepository: (repo: GitRepository | null) => void;
  selectedRepository: GitRepository | null;
  disabled?: boolean;
}

export function GitRepositorySelector({
  onSelectRepository,
  selectedRepository,
  disabled = false,
}: GitRepositorySelectorProps) {
  // Demo repositories - in production this would come from user's saved repositories
  const [repositories] = useState<GitRepository[]>([
    {
      _id: 'demo-1',
      name: 'my-awesome-app',
      url: 'https://github.com/username/my-awesome-app',
      branch: 'main',
      isPrivate: false,
    },
    {
      _id: 'demo-2',
      name: 'react-project',
      url: 'https://github.com/username/react-project',
      branch: 'develop',
      isPrivate: true,
    },
    {
      _id: 'demo-3',
      name: 'nextjs-starter',
      url: 'https://github.com/username/nextjs-starter',
      branch: 'main',
      isPrivate: false,
    },
  ]);

  const handleRepositorySelect = (repo: GitRepository) => {
    onSelectRepository(repo);
    toast.success(`Selected repository: ${repo.name}`);
  };

  const handleClearSelection = () => {
    onSelectRepository(null);
    toast.info('Cleared repository selection - will use default template');
  };

  if (repositories.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-content-secondary">
        <GitHubLogoIcon className="size-4" />
        <span>No git repositories configured.</span>
        <a href="/settings" className="text-content-primary underline hover:no-underline">
          Add repositories in settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <GitHubLogoIcon className="size-4 text-content-secondary" />

      <Menu
        buttonProps={{
          variant: 'neutral',
          size: 'sm',
          disabled,
          className: 'justify-between min-w-[200px]',
          children: (
            <>
              <span className="truncate">
                {selectedRepository ? selectedRepository.name : 'Use template (default)'}
              </span>
              <ChevronDownIcon className="ml-2 size-4 shrink-0" />
            </>
          ),
        }}
      >
        <MenuItem action={handleClearSelection}>
          <div className="flex flex-col">
            <span className="font-medium">Use template (default)</span>
            <span className="text-xs text-content-tertiary">Start with the default Chef template</span>
          </div>
        </MenuItem>

        <MenuItem action={() => handleRepositorySelect(repositories[0])}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{repositories[0]?.name}</span>
            </div>
            <span className="text-xs text-content-tertiary">{repositories[0]?.url}</span>
          </div>
        </MenuItem>

        <MenuItem action={() => handleRepositorySelect(repositories[1])}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{repositories[1]?.name}</span>
              <span className="rounded bg-bolt-elements-background-depth-3 px-2 py-1 text-xs text-content-secondary">
                Private
              </span>
            </div>
            <span className="text-xs text-content-tertiary">{repositories[1]?.url}</span>
          </div>
        </MenuItem>

        <MenuItem action={() => handleRepositorySelect(repositories[2])}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{repositories[2]?.name}</span>
            </div>
            <span className="text-xs text-content-tertiary">{repositories[2]?.url}</span>
          </div>
        </MenuItem>
      </Menu>

      {selectedRepository && (
        <Button variant="neutral" size="sm" onClick={handleClearSelection} disabled={disabled} className="text-xs">
          Clear
        </Button>
      )}
    </div>
  );
}
