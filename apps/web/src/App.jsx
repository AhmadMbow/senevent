import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getEvenements, getSupabase } from "@senevent/shared";
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
    getSupabase().auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Ecouter tout changement de session (login, logout, refresh).
    const { data: subscription } = getSupabase().auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    // Nettoyage : desabonner l'ecouteur au demontage.
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Lecture des evenements depuis Supabase (remplace le mock JSON du Lab 3).
  // La policy RLS "select using (true)" autorise la lecture publique.
  //
  // "*, profiles(nom)" ramene toutes les colonnes de evenements plus le nom de
  // l'organisateur : Supabase suit la cle etrangere organisateur_id declaree au
  // Lab 5. Les 5 evenements seed n'ont pas d'organisateur, leur profiles est null.
  // Le tri par date_debut est fait par PostgreSQL, pas par le client.
  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await getEvenements();
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
        {/* Apres une ecriture, on re-fetch au lieu de bricoler l'etat local :
            la liste reste ce que la base dit, sans divergence possible. */}
        <Route
          path="/nouveau"
          element={<NouvelEvenement onAjoutReussi={charger} />}
        />
        <Route
          path="/evenement/:id"
          element={
            <Detail
              evenements={evenements}
              session={session}
              onSupprime={charger}
            />
          }
        />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<NonTrouvee />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
