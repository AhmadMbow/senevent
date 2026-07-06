import { Link } from "react-router-dom";
import styles from "./EvenementCarte.module.css";

const EvenementCarte = ({ ev, afficherDetails }) => {
  const prix = ev.prix === 0 ? "Gratuit" : `${ev.prix} FCFA`;

  return (
    <Link to={`/evenement/${ev.id}`} className={styles.lien}>
      <div className={styles.carte}>
        <h3 className={styles.titre}>{ev.titre}</h3>
        <p className={styles.info}>Categorie : {ev.categorie}</p>
        {afficherDetails && (
          <p className={styles.info}>Lieu : {ev.lieu_nom}</p>
        )}
        <p className={styles.prix}>{prix}</p>
      </div>
    </Link>
  );
};

export default EvenementCarte;
