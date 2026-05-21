import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

/** 需在 ThemeProvider 内使用，使 Toast 与深浅色一致 */
export function RootToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

  return <Toaster position="top-center" theme={theme} richColors />;
}
