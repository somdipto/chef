import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { ApiKeyCard } from '~/components/settings/ApiKeyCard';
import { ThemeCard } from '~/components/settings/ThemeCard';
import { ProfileCard } from '~/components/settings/ProfileCard';
import { UsageCard } from '~/components/settings/UsageCard';
import { Toaster } from '~/components/ui/Toaster';
import { UserProvider } from '~/components/UserProvider';
import { GithubRepositoriesCard } from './settings/GithubRepositoriesCard';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export function SettingsContent() {
  const memberDetails = useQuery(api.sessions.getCurrentMemberDetails);
  const isGithubConnected = !!memberDetails?.githubAccessToken;
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast.error(error);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  return (
    <UserProvider>
      <div className="min-h-screen bg-bolt-elements-background-depth-2">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            <a href="/" className="inline-flex" title="Back to Chat">
              <ArrowLeftIcon />
            </a>
            <h1 className="text-3xl font-bold text-content-primary">Settings</h1>
          </div>

          <div className="space-y-6">
            <ProfileCard />
            {isGithubConnected && <GithubRepositoriesCard />}
            <UsageCard />
            <ApiKeyCard />
            <ThemeCard />
          </div>
        </div>
        <Toaster />
      </div>
    </UserProvider>
  );
}
