import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n.ts";

import { Analytics } from "@vercel/analytics/react";
import { HelmetProvider } from "react-helmet-async";
/* import { SpeedInsights } from "@vercel/speed-insights/next"; */

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Analytics />
    {/*     <SpeedInsights /> */}
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
