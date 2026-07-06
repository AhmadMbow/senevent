import { Link } from "react-router-dom";

const NonTrouvee = () => {
  return (
    <div style={{ maxWidth: 700, margin: "3rem auto", textAlign: "center" }}>
      <h1 style={{ color: "#1a3a5c" }}>404 — Page introuvable</h1>
      <p>La page que vous cherchez n'existe pas.</p>
      <Link to="/">Retour a l'accueil</Link>
    </div>
  );
};

export default NonTrouvee;
