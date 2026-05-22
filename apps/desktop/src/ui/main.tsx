import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, BrowserRouter } from "react-router-dom";

const Router = window.electron ? HashRouter : BrowserRouter;
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { authClient } from "./lib/auth-client";
import { instrumentConvexClient } from "./lib/convex-debug";
import AuthSetup from "./AuthSetup";

// Set platform class on <html> synchronously before React mounts (prevents layout shift)
if (window.electron?.platform === 'darwin') {
  document.documentElement.classList.add('electron-mac');
} else if (window.electron?.platform === 'win32') {
  document.documentElement.classList.add('electron-windows');
} else if (window.electron?.platform) {
  document.documentElement.classList.add('electron-linux');
}

const ConvexDebugPanel = lazy(() => import("./components/debug/ConvexDebugPanel"));

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

if (import.meta.env.DEV) {
  instrumentConvexClient(convex);
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <AuthSetup />
          <App />
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <ConvexDebugPanel />
            </Suspense>
          )}
        </ConvexBetterAuthProvider>
      </Router>
    </QueryClientProvider>
  </StrictMode>
);
