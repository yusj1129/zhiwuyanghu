import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import { initSupabase } from '@/lib/supabase'
import { RootToaster } from '@/components/RootToaster'

const rootEl = document.getElementById('root')!

function formatError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  
  // 处理 Error 对象
  if (err instanceof Error) {
    return `${err.name}: ${err.message}\nStack: ${err.stack}`;
  }
  
  // 处理 Supabase/Postgrest 错误对象
  if (err && typeof err === 'object') {
    const details = err.message || err.details || err.hint || '';
    const code = err.code || '';
    if (details || code) {
      return `[Code: ${code}] ${details}\nFull Error: ${JSON.stringify(err, null, 2)}`.trim();
    }
  }

  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

const originalError = console.error;
console.error = (...args: any[]) => {
  const formattedArgs = args.map(arg => {
    if (arg && typeof arg === 'object') {
      return formatError(arg);
    }
    return arg;
  });
  originalError.apply(console, formattedArgs);
};

// 全局错误捕获
window.addEventListener('error', (event) => {
  console.error('[Global Error]', formatError(event.error || event.message));
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', formatError(event.reason));
});

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const formattedArgs = args.map(arg => {
    if (arg && typeof arg === 'object') {
      return formatError(arg);
    }
    return arg;
  });
  originalWarn.apply(console, formattedArgs);
};

async function bootstrap() {
  try {
    const session = await initSupabase();
    console.log('[Supabase] Init success, session:', !!session);
  } catch (err: any) {
    console.error('[Supabase] init failed:', formatError(err));
  }

  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="plant-app-theme">
        <BrowserRouter>
          <App />
          <RootToaster />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

void bootstrap()
