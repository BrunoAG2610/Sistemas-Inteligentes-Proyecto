import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/app.css";

const ROOT_ID = "root";
const container = document.getElementById(ROOT_ID);
if (!container) throw new Error(`Falta el elemento #${ROOT_ID} en index.html.`);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
