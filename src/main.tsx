import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { FournisseurAuth } from "./contexte/FournisseurAuth";
import "./index.css";
import "./i18n.ts";

const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Analytics />
    <QueryClientProvider client={clientRequetes}>
      <FournisseurAuth>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </FournisseurAuth>
    </QueryClientProvider>
  </React.StrictMode>
);
