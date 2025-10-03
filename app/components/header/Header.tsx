import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chatId';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/components/header/ChatDescription.client';
import { DeployButton } from './DeployButton';
import { ShareButton } from './ShareButton';
import { useConvexSessionIdOrNullOrLoading } from '~/lib/stores/sessionId';
import { HamburgerMenuIcon, PersonIcon, GearIcon, ExitIcon } from '@radix-ui/react-icons';
import { DownloadButton } from './DownloadButton';
import { LoggedOutHeaderButtons } from './LoggedOutHeaderButtons';
import { profileStore, setProfile } from '~/lib/stores/profile';
import { Menu as MenuComponent, MenuItem as MenuItemComponent } from '@ui/Menu';
import { SESSION_ID_KEY } from '~/components/chat/ChefAuthWrapper';
import { FeedbackButton } from './FeedbackButton';
import { DiscordButton } from './DiscordButton';
import { PromptDebugButton } from './PromptDebugButton';
import { ReferButton } from './ReferButton';
import { useSelectedTeamSlug } from '~/lib/stores/convexTeams';
import { useUsage } from '~/lib/stores/usage';
import { useReferralStats } from '~/lib/hooks/useReferralCode';
import { Menu } from '~/components/sidebar/Menu.client';
import { useAuth } from '@workos-inc/authkit-react';

export function Header({ hideSidebarIcon = false }: { hideSidebarIcon?: boolean }) {
  const chat = useStore(chatStore);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sessionId = useConvexSessionIdOrNullOrLoading();
  const isLoggedIn = sessionId !== null;
  const showSidebarIcon = !hideSidebarIcon && isLoggedIn;

  const profile = useStore(profileStore);
  const { signOut } = useAuth();

  const teamSlug = useSelectedTeamSlug();
  const { isPaidPlan } = useUsage({ teamSlug });
  const referralStats = useReferralStats();

  const handleLogout = () => {
    setProfile(null);
    window.localStorage.removeItem(SESSION_ID_KEY);
    signOut({ returnTo: window.location.origin });
  };

  const handleSettingsClick = () => {
    window.location.pathname = '/settings';
  };

  return (
    <header className={'flex h-[var(--header-height)] items-center overflow-x-auto overflow-y-hidden border-b border-bolt-elements-borderColor bg-gradient-to-r from-bolt-elements-background-depth-1 to-bolt-elements-background-depth-2 px-5 shadow-sm'}>
      <div className="z-40 flex cursor-pointer items-center gap-5 text-bolt-elements-textPrimary">
        {showSidebarIcon && (
          <HamburgerMenuIcon
            className="size-6 shrink-0 text-bolt-elements-textPrimary hover:opacity-80 transition-opacity"
            data-hamburger-menu
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
          />
        )}
        <a href="/" className="flex items-center">
          {/* The logo is shifted up slightly, to visually align it with the hamburger icon. */}
          <img src="/chef.svg" alt="Chef logo" width={72} height={42} className="relative -top-0.5" />
        </a>
        <a
          href="https://github.com/get-convex/chef"
          target="_blank"
          rel="noopener noreferrer"
          className="relative hidden cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg bg-bolt-elements-background-depth-3 p-2 text-sm font-medium text-bolt-elements-textPrimary transition-all hover:bg-bolt-elements-background-depth-2 focus-visible:border focus-visible:border-border-selected focus-visible:outline-none sm:flex shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              fill="currentColor"
            />
          </svg>
          <span className="font-medium">Star on GitHub</span>
        </a>
      </div>
      <>
        {chat.started && (
          <span className="flex-1 truncate px-4 text-center text-bolt-elements-textPrimary font-medium">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
        )}
        <ClientOnly>
          {() => (
            <div className="ml-auto flex items-center gap-2">
              {!isLoggedIn && <LoggedOutHeaderButtons />}

              {chat.started && (
                <>
                  <PromptDebugButton />
                  {isPaidPlan === false && referralStats && referralStats.left > 0 && <ReferButton />}
                  <DownloadButton />
                  <ShareButton />
                  <DeployButton />
                  <div className="mr-1">
                    <HeaderActionButtons />
                  </div>
                </>
              )}
              {profile && (
                <MenuComponent
                  placement="top-start"
                  buttonProps={{
                    variant: 'neutral',
                    title: 'User menu',
                    inline: true,
                    className: 'rounded-full',
                    icon: profile.avatar ? (
                      <img
                        src={profile.avatar}
                        className="size-8 min-w-8 rounded-full object-cover"
                        loading="eager"
                        decoding="sync"
                      />
                    ) : (
                      <PersonIcon className="size-8 min-w-8 rounded-full border text-content-secondary" />
                    ),
                  }}
                >
                  <FeedbackButton showInMenu={true} />
                  <DiscordButton showInMenu={true} />
                  <hr className="border-bolt-elements-borderColor" />
                  <MenuItemComponent action={handleSettingsClick}>
                    <GearIcon className="text-bolt-elements-textTertiary" />
                    Settings & Usage
                  </MenuItemComponent>
                  <MenuItemComponent action={handleLogout}>
                    <ExitIcon className="text-bolt-elements-textTertiary" />
                    Log out
                  </MenuItemComponent>
                </MenuComponent>
              )}
            </div>
          )}
        </ClientOnly>
      </>
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </header>
  );
}
