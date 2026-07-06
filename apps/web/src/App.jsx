import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Accueil from "./pages/Accueil";
import NouvelEvenement from "./pages/NouvelEvenement";
import Detail from "./pages/Detail";
import Auth from "./pages/Auth";
import NonTrouvee from "./pages/NonTrouvee";
import NavBar from "./components/NavBar";

const App = () => {
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Recuperer la session actuelle au montage (lue depuis le localStorage).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Ecouter tout changement de session (login, logout, refresh).
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    // Nettoyage : desabonner l'ecouteur au demontage.
    return () => subscription.subscription.unsubscribe();
  }, []);

  // La fonction charger() du Lab 3 reste pour l'instant, on l'adaptera au Lab 6.
  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch("/evenements.json");
      if (!reponse.ok) throw new Error(`Erreur HTTP ${reponse.status}`);
      const data = await reponse.json();
      setEvenements(data);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const ajouterEvenement = nouvel => {
    setEvenements(precedents => [nouvel, ...precedents]);
  };

  return (
    <BrowserRouter>
      <NavBar session={session} />
      <Routes>
        <Route
          path="/"
          element={
            <Accueil
              evenements={evenements}
              chargement={chargement}
              erreur={erreur}
              onReessayer={charger}
            />
          }
        />
        <Route
          path="/nouveau"
          element={<NouvelEvenement onAjouter={ajouterEvenement} />}
        />
        <Route
          path="/evenement/:id"
          element={<Detail evenements={evenements} />}
        />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<NonTrouvee />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
