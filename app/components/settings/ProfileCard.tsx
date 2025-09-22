import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { ExitIcon, ExternalLinkIcon, PersonIcon } from '@radix-ui/react-icons';
import { LoadingTransition } from '@ui/Loading';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@ui/Button';
import Cookies from 'js-cookie';

export function ProfileCard() {
  const profile = useStore(profileStore);
  const { signOut } = useAuth();
  const memberDetails = useQuery(api.sessions.getCurrentMemberDetails);
  const disconnectFromGithub = useMutation(api.users.disconnectFromGithub);

  const isGithubConnected = !!memberDetails?.githubAccessToken;

  const handleLogout = () => {
    signOut({ returnTo: window.location.origin });
  };

  const handleConnectToGithub = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      alert(
        'VITE_GITHUB_CLIENT_ID is not defined. Please add it to your .env.development file.',
      );
      return;
    }
    const redirectUri = `${window.location.origin}/api/github/callback`;
    const scope = 'repo';
    const state = crypto.randomUUID();
    Cookies.set('githubOauthState', state, { expires: 1 / 24 }); // Expires in 1 hour
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    window.location.href = authUrl;
  };

  const handleDisconnectFromGithub = async () => {
    await disconnectFromGithub();
  };

  return (
    <LoadingTransition loadingProps={{ className: 'h-[12.375rem]' }}>
      {profile && (
        <div className="w-full rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-content-primary">Profile</h2>
            <div className="flex items-center gap-4">
              <div className="size-20 min-w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile?.username || 'User'} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <PersonIcon className="size-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-content-primary">{profile.username}</h3>
                {profile.email && <p className="text-sm text-content-secondary">{profile.email}</p>}
                <div className="mt-2 flex flex-col items-start gap-2">
                  <a
                    href="https://dashboard.convex.dev/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <ExternalLinkIcon />
                    Manage your profile on the Convex Dashboard
                  </a>
                  {isGithubConnected ? (
                    <Button variant="danger" onClick={handleDisconnectFromGithub}>
                      Disconnect from GitHub
                    </Button>
                  ) : (
                    <Button variant="neutral" onClick={handleConnectToGithub}>
                      Connect to GitHub
                    </Button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 bg-transparent text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <ExitIcon />
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </LoadingTransition>
  );
}
