import { useState } from "react";

const App = () => {
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(false);

  const charger = async () => {
    setChargement(true);
    try {
      const reponse = await fetch("/evenements.json");
      const data = await reponse.json();
      setEvenements(data);
    } catch (error) {
      console.error("Erreur :", error);
    }
    setChargement(false);
  };

  return (
    <div style={{ maxWidth: "700px", margin: "2rem auto",
                  fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#1a3a5c" }}>SenEvent --- Evenements a Dakar</h1>
      <button onClick={charger} disabled={chargement}>
        {chargement ? "Chargement..." : "Charger les evenements"}
      </button>
      {evenements.map(ev => (
        <EvenementCarte key={ev.id} ev={ev} />
      ))}
    </div>
  );
};

const EvenementCarte = ({ ev }) => {
  const prix = ev.prix === 0 ? "Gratuit" : `${ev.prix} FCFA`;
  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem",
                  margin: "0.8rem 0", borderRadius: "8px" }}>
      <h3 style={{ margin: 0, color: "#1a3a5c" }}>{ev.titre}</h3>
      <p style={{ margin: "0.2rem 0", color: "#555" }}>
        Categorie : {ev.categorie}
      </p>
      <p style={{ margin: "0.2rem 0", color: "#555" }}>
        Lieu : {ev.lieu_nom}
      </p>
      <p style={{ margin: "0.2rem 0", color: "#ea7d2b", fontWeight: "bold" }}>
        {prix}
      </p>
    </div>
  );
};

export default App;
