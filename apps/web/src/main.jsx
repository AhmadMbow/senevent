import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initSupabase } from "@senevent/shared";
import App from "./App.jsx";
import "./index.css";

// Initialiser Supabase avec les variables d'environnement de Vite.
// C'est ici, et seulement ici, qu'on lit import.meta.env.VITE_...
initSupabase(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
