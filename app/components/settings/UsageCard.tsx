import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { getStoredTeamSlug } from '~/lib/stores/convexTeams';
import { convexTeamsStore } from '~/lib/stores/convexTeams';
import { TeamSelector } from '~/components/convex/TeamSelector';
import { Callout } from '@ui/Callout';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { ProgressBar } from '@ui/ProgressBar';
import { useUsage } from '~/lib/stores/usage';
import { renderTokenCount } from '~/lib/convexUsage';

export function UsageCard() {
  const teams = useStore(convexTeamsStore);
  const [selectedTeamSlug, setSelectedTeamSlug] = useState(getStoredTeamSlug() ?? teams?.[0]?.slug ?? null);
  useEffect(() => {
    if (teams && !selectedTeamSlug) {
      setSelectedTeamSlug(teams[0]?.slug);
    }
    // No need to run if only `selectedTeamSlug` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const { isLoadingUsage, usagePercentage, used, quota, isPaidPlan } = useUsage({
    teamSlug: selectedTeamSlug,
  });

  return (
    <div className="rounded-xl border border-bolt-elements-borderColor bg-gradient-to-br from-bolt-elements-background-depth-1 to-bolt-elements-background-depth-2 shadow-lg">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-bolt-elements-textPrimary">Chef Usage</h2>
          <div className="ml-auto">
            <TeamSelector selectedTeamSlug={selectedTeamSlug} setSelectedTeamSlug={setSelectedTeamSlug} />
          </div>
        </div>
        <p className="mb-2 text-sm text-bolt-elements-textSecondary">Your Convex team comes with tokens included for Chef.</p>
        <p className="mb-2 text-sm text-bolt-elements-textSecondary">
          On paid Convex subscriptions, additional usage will be subject to metered billing.
        </p>
        <p className="mb-5 text-sm text-bolt-elements-textSecondary">
          On free plans, Chef will not be usable once you hit the limit for the current billing period.
        </p>
        <div className="space-y-5">
          <div className="w-80 max-w-80">
            {isLoadingUsage ? (
              <div className="size-full h-3 overflow-hidden rounded-full bg-bolt-elements-background-depth-3">
                <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar fraction={usagePercentage / 100} variant="solid" ariaLabel="Token Usage percentage" />
                </div>
                <span className="text-sm font-medium text-bolt-elements-textPrimary">
                  {usagePercentage.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-bolt-elements-textSecondary">
              Used: <span className="font-medium text-bolt-elements-textPrimary">{renderTokenCount(used || 0)}</span>
            </span>
            <span className="text-bolt-elements-textSecondary">
              Available: <span className="font-medium text-bolt-elements-textPrimary">{renderTokenCount(quota || 0)}</span>
            </span>
          </div>
          {!isLoadingUsage && !isPaidPlan && used > quota ? (
            <Callout variant="upsell" className="rounded-xl p-4">
              <div className="flex w-full flex-col gap-4">
                <h3 className="text-lg font-semibold">You&apos;ve used all the tokens included with your free plan.</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    href={`https://dashboard.convex.dev/t/${selectedTeamSlug}/settings/billing?source=chef`}
                    icon={<ExternalLinkIcon />}
                  >
                    Upgrade your plan
                  </Button>
                  <span className="text-bolt-elements-textSecondary">or add your own API key below to send more messages.</span>
                </div>
              </div>
            </Callout>
          ) : (
            <Button
              icon={<ExternalLinkIcon />}
              inline
              href={`https://dashboard.convex.dev/t/${selectedTeamSlug}/settings/billing`}
            >
              Manage Subscription
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
