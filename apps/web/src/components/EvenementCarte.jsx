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

export default EvenementCarte;
