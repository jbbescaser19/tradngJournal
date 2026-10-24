import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { TradesProvider } from "./context/TradesContext.jsx";
import "../src/";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <TradesProvider>
        <App />
      </TradesProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
