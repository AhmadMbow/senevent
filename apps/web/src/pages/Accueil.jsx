import { useState, useEffect } from "react";
import EvenementCarte from "../components/EvenementCarte";
import SearchBar from "../components/SearchBar";
import EtatChargement from "../components/EtatChargement";
import styles from "./Accueil.module.css";

const Accueil = ({ evenements, chargement, erreur, onReessayer }) => {
  const [recherche, setRecherche] = useState("");

  const evenementsFiltres = evenements.filter(ev =>
    ev.titre.toLowerCase().includes(recherche.toLowerCase())
  );

  useEffect(() => {
    document.title =
      evenementsFiltres.length > 0
        ? `(${evenementsFiltres.length}) SenEvent`
        : "SenEvent";
  }, [evenementsFiltres.length]);

  return (
    <div className={styles.container}>
      <h1 className={styles.titre}>SenEvent — Evenements a Dakar</h1>
      <EtatChargement
        chargement={chargement}
        erreur={erreur}
        onReessayer={onReessayer}
      />
      {!chargement && !erreur && (
        <>
          <SearchBar recherche={recherche} onRecherche={setRecherche} />
          <p className={styles.compteur}>
            {evenementsFiltres.length} evenement(s) trouve(s)
          </p>
          {evenementsFiltres.length === 0 ? (
            <p className={styles.messageVide}>Aucun evenement ne correspond.</p>
          ) : (
            <div className={styles.grille}>
              {evenementsFiltres.map(ev => (
                <EvenementCarte key={ev.id} ev={ev} afficherDetails={true} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Accueil;
