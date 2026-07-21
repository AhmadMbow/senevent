import { useState, useEffect } from "react";
import { estInscrit, inscrire, desinscrire } from "@senevent/shared";
import styles from "./BoutonInscription.module.css";

const BoutonInscription = ({ evenementId, session }) => {
  const [inscrit, setInscrit] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  // Au montage, on demande a la base si cette inscription existe deja.
  // Les .eq() s'enchainent : WHERE evenement_id = ... AND utilisateur_id = ...
  useEffect(() => {
    const verifier = async () => {
      if (!session) {
        setChargement(false);
        return;
      }
      setChargement(true);
      try {
        setInscrit(await estInscrit(evenementId, session.user.id));
      } catch (e) {
        setErreur(e.message);
      } finally {
        setChargement(false);
      }
    };
    verifier();
  }, [evenementId, session]);

  const sInscrire = async () => {
    setErreur(null);
    // La policy "inscriptions_insert_self" impose utilisateur_id = auth.uid() :
    // on ne peut inscrire que soi-meme, quoi qu'envoie le client.
    try {
      await inscrire(evenementId, session.user.id);
      setInscrit(true);
    } catch (e) {
      setErreur(e.message);
    }
  };

  const seDesinscrire = async () => {
    setErreur(null);
    try {
      await desinscrire(evenementId, session.user.id);
      setInscrit(false);
    } catch (e) {
      setErreur(e.message);
    }
  };

  if (!session) {
    return <p className={styles.info}>Connectez-vous pour vous inscrire.</p>;
  }

  if (chargement) {
    return <p className={styles.info}>...</p>;
  }

  return (
    <div className={styles.zone}>
      {inscrit ? (
        <button onClick={seDesinscrire} className={styles.desinscrire}>
          Se desinscrire
        </button>
      ) : (
        <button onClick={sInscrire} className={styles.inscrire}>
          S'inscrire
        </button>
      )}
      {erreur && <p className={styles.erreur}>Erreur : {erreur}</p>}
    </div>
  );
};

export default BoutonInscription;
