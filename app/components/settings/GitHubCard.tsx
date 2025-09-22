import { useConvex } from 'convex/react';
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from 'sonner';
import { GitHubLogoIcon, LinkBreak2Icon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { captureException } from '@sentry/remix';
import { Spinner } from '@ui/Spinner';

export function GitHubCard() {
  const convex = useConvex();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const githubConnection = useQuery(api.github.getGitHubConnection);

  const handleGitHubConnect = async () => {
    setIsConnecting(true);

    try {
      const popup = window.open(
        '/github/connect',
        'github-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups and try again.');
        setIsConnecting(false);
        return;
      }

      // Listen for the OAuth completion message
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'github-oauth-success') {
          const { accessToken, user } = event.data;

          // Store the GitHub token in Convex
          convex.mutation(api.github.connectGitHub, {
            githubToken: accessToken,
            githubUser: user,
          }).then(() => {
            toast.success('GitHub connected successfully!', { id: 'github-connect' });
            popup.close();
            window.removeEventListener('message', messageHandler);
            setIsConnecting(false);
          }).catch((error) => {
            captureException(error);
            toast.error('Failed to connect GitHub account');
            popup.close();
            window.removeEventListener('message', messageHandler);
            setIsConnecting(false);
          });
        }
      };

      window.addEventListener('message', messageHandler);

      // Close popup if user closes it manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      captureException(error);
      toast.error('Failed to connect GitHub account');
      setIsConnecting(false);
    }
  };

  const handleGitHubDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      await convex.mutation(api.github.disconnectGitHub);
      toast.success('GitHub disconnected successfully!', { id: 'github-disconnect' });

      // Clear localStorage
      localStorage.removeItem('githubAccessToken');
      localStorage.removeItem('githubUser');
    } catch (error) {
      captureException(error);
      toast.error('Failed to disconnect GitHub account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleVisitGitHub = () => {
    if (githubConnection?.githubUser) {
      window.open(`https://github.com/${githubConnection.githubUser.login}`, '_blank');
    }
  };

  if (githubConnection === undefined) {
    return (
      <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
        <div className="p-6">
          <div className="h-[200px] w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  const isConnected = !!githubConnection;

  return (
    <div className="rounded-lg border bg-bolt-elements-background-depth-1 shadow-sm">
      <div className="p-6">
        <h2 className="mb-2 text-xl font-semibold text-content-primary">GitHub Integration</h2>

        <p className="mb-1 max-w-prose text-sm text-content-secondary">
          Connect your GitHub account to import and work with your existing repositories.
        </p>
        <p className="mb-4 max-w-prose text-sm text-content-secondary">
          Once connected, you can pull repositories and continue development directly in Chef.
        </p>

        <div className="space-y-4">
          {isConnected && githubConnection.githubUser ? (
            <div className="flex items-center gap-3 rounded-lg border bg-bolt-elements-background-depth-2 p-4">
              <img
                src={githubConnection.githubUser.avatar_url}
                alt={githubConnection.githubUser.login}
                className="h-10 w-10 rounded-full"
              />
              <div className="flex-1">
                <p className="font-medium text-content-primary">
                  {githubConnection.githubUser.name || githubConnection.githubUser.login}
                </p>
                <p className="text-sm text-content-secondary">
                  @{githubConnection.githubUser.login}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="neutral"
                  onClick={handleVisitGitHub}
                  icon={<ExternalLinkIcon />}
                  inline
                  title="Visit GitHub profile"
                />
                <Button
                  variant="danger"
                  onClick={handleGitHubDisconnect}
                  disabled={isDisconnecting}
                  icon={isDisconnecting ? <Spinner /> : <LinkBreak2Icon />}
                  inline
                  title="Disconnect GitHub"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-content-secondary/30 bg-bolt-elements-background-depth-2 p-6">
              <div className="text-center">
                <GitHubLogoIcon className="mx-auto h-12 w-12 text-content-secondary" />
                <h3 className="mt-4 text-lg font-medium text-content-primary">
                  Connect your GitHub account
                </h3>
                <p className="mt-2 text-sm text-content-secondary">
                  Import your repositories and start coding with Chef's AI assistance.
                </p>
                <Button
                  onClick={handleGitHubConnect}
                  disabled={isConnecting}
                  icon={isConnecting ? <Spinner /> : <GitHubLogoIcon />}
                  className="mt-4"
                >
                  {isConnecting ? 'Connecting...' : 'Connect GitHub'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}