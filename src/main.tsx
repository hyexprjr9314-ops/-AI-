import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { hydrateFromServer } from './lib/storage';
import './index.css';

// Pulls the latest saved state down from the server (SQLite via /api/state)
// into localStorage before the app's first render, so every screen sees
// up-to-date data instead of whatever this browser last cached locally.
function HydrationGate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateFromServer().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        불러오는 중...
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HydrationGate />
  </StrictMode>,
);
