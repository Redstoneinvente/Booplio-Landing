import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/fredoka/latin-400.css";
import "@fontsource/fredoka/latin-500.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "./styles.css";
import App from "./App";
import { Store } from "./store";
import { initialRoute } from "./handoff";
const entry = initialRoute(location.pathname, location.search, location.hash);
if (entry && !location.hash) history.replaceState(null, "", `${location.pathname}${location.search}${entry}`);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Store>
      <App />
    </Store>
  </React.StrictMode>,
);
