import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Accueil from "./pages/Accueil";
import NouvelEvenement from "./pages/NouvelEvenement";
import Detail from "./pages/Detail";
import NonTrouvee from "./pages/NonTrouvee";
import NavBar from "./components/NavBar";

const App = () => {
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  // Chargement du mock evenements.json (herite du Lab 3).
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
      <NavBar />
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
        <Route path="*" element={<NonTrouvee />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
