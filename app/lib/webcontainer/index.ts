import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from 'chef-agent/constants';
import { cleanStackTrace } from '~/utils/stacktrace';
import { createScopedLogger } from 'chef-agent/utils/logger';
import { setContainerBootState, ContainerBootState } from '~/lib/stores/containerBootState';
import { workbenchStore } from '~/lib/stores/workbench.client';
import { chooseExperience } from '~/utils/experienceChooser';

interface WebContainerContext {
  loaded: boolean;
}

const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

const logger = createScopedLogger('webcontainer');

let shouldBootWebcontainer = false;
if (!import.meta.env.SSR) {
  const experience = chooseExperience(navigator.userAgent, window.crossOriginIsolated);

  shouldBootWebcontainer = experience === 'the-real-thing' || experience === 'mobile-warning';
  if (!shouldBootWebcontainer) {
    console.error('Not attempting to boot webcontainer because window.crossOriginIsolated is not true');
  }
}

if (shouldBootWebcontainer) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        setContainerBootState(ContainerBootState.STARTING);
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        // Listen for preview errors
        webcontainer.on('preview-message', (message) => {
          logger.info('WebContainer preview message:', JSON.stringify(message));

          // Handle custom messages for GitHub import
          if ((message as any).type === 'chef:import-github' && typeof (message as any).fullName === 'string') {
            // TODO: Implement fetch and extraction of repo contents via GitHub API
            // For now, just surface an alert that import is not yet implemented.
            workbenchStore.actionAlert.set({
              type: 'preview',
              title: 'Import from GitHub',
              description: `Requested import for ${(message as any).fullName}.`,
              content: 'Import flow will fetch a repo archive and write files into your workspace.',
              source: 'preview',
            });
          }

          // Handle both uncaught exceptions and unhandled promise rejections
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title: isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception',
              description: message.message,
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });
        // Set the container boot state to LOADING_SNAPSHOT to hand off control
        // to the container setup code.
        setContainerBootState(ContainerBootState.LOADING_SNAPSHOT);
        (globalThis as any).webcontainer = webcontainer;
        return webcontainer;
      })
      .catch((error) => {
        setContainerBootState(ContainerBootState.ERROR, error);
        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
