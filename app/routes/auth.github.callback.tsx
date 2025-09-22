import { ClientOnly } from 'remix-utils/client-only';
import { GitHubCallback } from '~/components/settings/GitHubCallback.client';

export default function _() {
  return <ClientOnly>{() => <GitHubCallback />}</ClientOnly>;
}

