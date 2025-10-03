import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="my-12 flex max-w-2xl mx-auto flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-xl border border-bolt-elements-borderColor bg-gradient-to-br from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-1 shadow-lg dark:shadow-bolt-elements-contentDivider"
      >
        <div className="flex items-center border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1/50 px-4 py-3 dark:bg-bolt-elements-background-depth-3">
          <a
            href="https://github.com/get-convex/chef"
            className="flex items-center gap-2 hover:text-bolt-elements-textPrimary dark:hover:text-bolt-elements-textSecondary transition-colors"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="inline-block"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="currentColor"
              style={{ display: 'inline-block', overflow: 'visible', verticalAlign: 'text-bottom' }}
            >
              <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z" />
            </svg>
            <span className="text-sm font-semibold text-bolt-elements-textPrimary dark:text-bolt-elements-textSecondary">README</span>
          </a>
        </div>
        <div className="flex flex-col gap-6 px-6 py-8 text-base sm:text-lg text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="leading-relaxed"
          >
            Chef is open-source, check out the GitHub repo{' '}
            <a
              href="https://github.com/get-convex/chef"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              here
            </a>
            .
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="leading-relaxed"
          >
            This is the only AI app builder that knows backend. By applying{' '}
            <a
              href="https://convex.dev"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              Convex
            </a>{' '}
            primitives directly to your code generation, your apps are automatically equipped with optimal backend
            patterns and best practices. Your full-stack apps come with a built-in database, zero config auth, file
            uploads, real-time UIs, and background workflows. If you want to check out the secret sauce that powers
            Chef, you can view or download the system prompt{' '}
            <a
              href="https://github.com/get-convex/chef/releases/latest"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              here
            </a>
            .
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="leading-relaxed"
          >
            As mentioned above, Chef&apos;s capabilities are enabled by being built on top of{' '}
            <a
              href="https://convex.dev"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              Convex
            </a>
            , the open-source reactive database designed to make life easy for web app developers. The
            &ldquo;magic&rdquo; in Chef is just the fact that it&apos;s using Convex&apos;s APIs, which are an ideal fit
            for codegen.
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="leading-relaxed"
          >
            Development of the Chef is led by the Convex team. We{' '}
            <a
              href="https://github.com/get-convex/chef/blob/main/CONTRIBUTING.md"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              welcome bug fixes
            </a>{' '}
            and{' '}
            <a
              href="https://discord.gg/convex"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              love receiving feedback
            </a>
            .
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="leading-relaxed"
          >
            This project is a fork of the stable branch of{' '}
            <a
              href="https://github.com/stackblitz-labs/bolt.diy"
              className="font-semibold text-bolt-elements-button-primary-backgroundHover hover:underline transition-colors"
            >
              bolt.diy
            </a>
            .
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex justify-center pt-2"
          >
            <a
              href="https://github.com/get-convex/chef"
              className="inline-flex items-center gap-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 px-5 py-2.5 text-base font-medium text-bolt-elements-textPrimary transition-all hover:bg-bolt-elements-background-depth-3 hover:shadow-md dark:border-bolt-elements-borderColor dark:bg-bolt-elements-background-depth-3 dark:text-bolt-elements-textPrimary dark:hover:bg-bolt-elements-background-depth-2"
            >
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              View on GitHub
            </a>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
