import { useState } from 'react';
import { toast } from 'sonner';
import { EyeNoneIcon, EyeOpenIcon, PlusIcon, TrashIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { TextInput } from '@ui/TextInput';
import { Checkbox } from '@ui/Checkbox';
import { captureException } from '@sentry/remix';
import { Spinner } from '@ui/Spinner';
import type { Id } from '@convex/_generated/dataModel';

export function GitCard() {
  // For demo purposes, using local state with sample data
  // This will be replaced with actual Convex queries once backend is set up
  const [repositories, setRepositories] = useState<GitRepository[]>([
    {
      _id: 'demo-1' as Id<'gitRepositories'>,
      name: 'my-awesome-app',
      url: 'https://github.com/username/my-awesome-app',
      branch: 'main',
      isPrivate: false,
      createdAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 86400000,
    },
  ]);
  const [isLoading] = useState(false);

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-content-primary">
          <GitHubLogoIcon className="size-5" />
          Git Repositories
        </h2>

        <p className="mb-4 max-w-prose text-sm text-content-secondary">
          Connect your Git repositories to start working on existing projects. You can add both public and private
          repositories.
        </p>

        <div className="space-y-4">
          {repositories?.map((repo: GitRepository) => (
            <GitRepositoryItem key={repo._id} repository={repo} isLoading={isLoading} onUpdate={setRepositories} />
          ))}

          <AddGitRepositoryForm isLoading={isLoading} onUpdate={setRepositories} />
        </div>
      </div>
    </div>
  );
}

interface GitRepository {
  _id: Id<'gitRepositories'>;
  name: string;
  url: string;
  branch?: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
}

function GitRepositoryItem({
  repository,
  isLoading,
  onUpdate,
}: {
  repository: GitRepository;
  isLoading: boolean;
  onUpdate: React.Dispatch<React.SetStateAction<GitRepository[]>>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    name: repository.name,
    url: repository.url,
    branch: repository.branch || 'main',
    accessToken: '',
    isPrivate: repository.isPrivate,
  });

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      setIsDeleting(true);
      // Simulate API call with demo functionality
      setTimeout(() => {
        // Update the repository in parent component
        onUpdate([]);
        toast.success('Repository updated successfully');
        setIsEditing(false);
        setIsDeleting(false);
      }, 1000);
    } catch (error) {
      captureException(error);
      toast.error('Failed to update repository');
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this repository?')) {
      return;
    }

    try {
      setIsDeleting(true);
      // Simulate API call with demo functionality
      setTimeout(() => {
        onUpdate([]);
        toast.success('Repository deleted successfully');
        setIsDeleting(false);
      }, 1000);
    } catch (error) {
      captureException(error);
      toast.error('Failed to delete repository');
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3 rounded-lg border p-4">
        <TextInput
          id="edit-repo-name"
          autoFocus
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="my-awesome-project"
          disabled={isDeleting}
        />

        <TextInput
          id="edit-repo-url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://github.com/username/repository"
          disabled={isDeleting}
        />

        <TextInput
          id="edit-repo-branch"
          value={formData.branch}
          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          placeholder="main"
          disabled={isDeleting}
        />

        <div className="relative">
          <TextInput
            id="edit-repo-token"
            type={showToken ? 'text' : 'password'}
            value={formData.accessToken}
            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
            placeholder="github_pat_..."
            disabled={isDeleting}
            // @ts-ignore Unclear issue with typing of design system
            action={() => setShowToken(!showToken)}
            actionIcon={showToken ? <EyeNoneIcon className="size-4" /> : <EyeOpenIcon className="size-4" />}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-repo-private"
            checked={formData.isPrivate}
            onChange={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
            disabled={isDeleting}
          />
          <label htmlFor="edit-repo-private" className="text-sm">
            Private repository
          </label>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isDeleting}>
            {isDeleting ? <Spinner className="size-4" /> : 'Save'}
          </Button>
          <Button variant="neutral" size="sm" onClick={() => setIsEditing(false)} disabled={isDeleting}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-content-primary">{repository.name}</h3>
          {repository.isPrivate && (
            <span className="rounded bg-bolt-elements-background-depth-3 px-2 py-1 text-xs text-content-secondary">
              Private
            </span>
          )}
        </div>
        <p className="text-sm text-content-secondary">{repository.url}</p>
        {repository.branch && <p className="text-xs text-content-tertiary">Branch: {repository.branch}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="neutral" size="sm" onClick={() => setIsEditing(true)} disabled={isLoading || isDeleting}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={isLoading || isDeleting}>
          {isDeleting ? (
            <Spinner className="size-4" />
          ) : (
            <>
              <TrashIcon className="size-4" />
              Delete
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function AddGitRepositoryForm({
  isLoading,
  onUpdate,
}: {
  isLoading: boolean;
  onUpdate: React.Dispatch<React.SetStateAction<GitRepository[]>>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    branch: 'main',
    accessToken: '',
    isPrivate: false,
  });

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      setIsSaving(true);
      // Simulate API call with demo functionality
      setTimeout(() => {
        const newRepo: GitRepository = {
          _id: `demo-${Date.now()}` as Id<'gitRepositories'>,
          name: formData.name.trim(),
          url: formData.url.trim(),
          branch: formData.branch.trim() || 'main',
          isPrivate: formData.isPrivate,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        onUpdate((prev: GitRepository[]) => [...prev, newRepo]);
        toast.success('Repository added successfully');
        setIsAdding(false);
        setFormData({
          name: '',
          url: '',
          branch: 'main',
          accessToken: '',
          isPrivate: false,
        });
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      captureException(error);
      toast.error('Failed to add repository');
      setIsSaving(false);
    }
  };

  if (isAdding) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <h3 className="font-medium text-content-primary">Add Git Repository</h3>

        <TextInput
          id="new-repo-name"
          autoFocus
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="my-awesome-project"
          disabled={isSaving}
        />

        <TextInput
          id="new-repo-url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://github.com/username/repository"
          disabled={isSaving}
        />

        <TextInput
          id="new-repo-branch"
          value={formData.branch}
          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          placeholder="main"
          disabled={isSaving}
        />

        <div className="relative">
          <TextInput
            id="new-repo-token"
            type={showToken ? 'text' : 'password'}
            value={formData.accessToken}
            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
            placeholder="github_pat_..."
            disabled={isSaving}
            // @ts-ignore Unclear issue with typing of design system
            action={() => setShowToken(!showToken)}
            actionIcon={showToken ? <EyeNoneIcon className="size-4" /> : <EyeOpenIcon className="size-4" />}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="new-repo-private"
            checked={formData.isPrivate}
            onChange={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
            disabled={isSaving}
          />
          <label htmlFor="new-repo-private" className="text-sm">
            Private repository
          </label>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={isSaving}>
            {isSaving ? <Spinner className="size-4" /> : 'Add Repository'}
          </Button>
          <Button variant="neutral" size="sm" onClick={() => setIsAdding(false)} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="neutral"
      size="sm"
      onClick={() => setIsAdding(true)}
      disabled={isLoading}
      className="border-dashed"
    >
      <PlusIcon className="mr-2 size-4" />
      Add Git Repository
    </Button>
  );
}
