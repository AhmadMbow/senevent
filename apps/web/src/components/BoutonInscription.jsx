import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
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
      const { data, error } = await supabase
        .from("inscriptions")
        .select("id")
        .eq("evenement_id", evenementId)
        .eq("utilisateur_id", session.user.id);

      if (error) {
        setErreur(error.message);
      } else {
        setInscrit(data.length > 0);
      }
      setChargement(false);
    };
    verifier();
  }, [evenementId, session]);

  const sInscrire = async () => {
    setErreur(null);
    // La policy "inscriptions_insert_self" impose utilisateur_id = auth.uid() :
    // on ne peut inscrire que soi-meme, quoi qu'envoie le client.
    const { error } = await supabase.from("inscriptions").insert({
      evenement_id: evenementId,
      utilisateur_id: session.user.id,
    });
    if (error) {
      setErreur(error.message);
    } else {
      setInscrit(true);
    }
  };

  const seDesinscrire = async () => {
    setErreur(null);
    const { error } = await supabase
      .from("inscriptions")
      .delete()
      .eq("evenement_id", evenementId)
      .eq("utilisateur_id", session.user.id);
    if (error) {
      setErreur(error.message);
    } else {
      setInscrit(false);
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
