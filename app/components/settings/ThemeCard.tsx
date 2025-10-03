import { useStore } from '@nanostores/react';
import { Button } from '@ui/Button';
import { toggleTheme } from '~/lib/stores/theme';
import { themeStore } from '~/lib/stores/theme';

export function ThemeCard() {
  const theme = useStore(themeStore);
  return (
    <div className="rounded-xl border border-bolt-elements-borderColor bg-gradient-to-br from-bolt-elements-background-depth-1 to-bolt-elements-background-depth-2 shadow-lg">
      <div className="p-6">
        <h2 className="mb-4 text-xl font-bold text-bolt-elements-textPrimary">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-bolt-elements-textSecondary">Theme</span>

          <Button 
            variant="secondary"
            onClick={() => toggleTheme()}
            className="px-4 py-2 rounded-lg font-medium"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </Button>
        </div>
      </div>
    </div>
  );
}
