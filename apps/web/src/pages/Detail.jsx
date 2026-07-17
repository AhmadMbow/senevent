import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BoutonInscription from "../components/BoutonInscription";
import styles from "./Detail.module.css";

const Detail = ({ evenements, session, onSupprime }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [erreurSuppression, setErreurSuppression] = useState(null);

  const evenement = evenements.find(ev => ev.id === Number(id));

  if (!evenement) {
    return (
      <div className={styles.container}>
        <p>Evenement introuvable.</p>
        <Link to="/" className={styles.retour}>
          Retour a la liste
        </Link>
      </div>
    );
  }

  const prix = evenement.prix === 0 ? "Gratuit" : `${evenement.prix} FCFA`;
  const date = new Date(evenement.date_debut).toLocaleString("fr-FR");

  // On n'affiche le bouton qu'au proprietaire : c'est du confort d'interface.
  // La securite, elle, vient de la policy RLS "evenements_delete_owner" : meme
  // un DELETE force depuis la console ne toucherait aucune ligne d'autrui.
  const estOrganisateur =
    session && session.user.id === evenement.organisateur_id;

  const supprimer = async () => {
    if (!window.confirm("Supprimer cet evenement ?")) return;
    setErreurSuppression(null);

    const { error } = await supabase
      .from("evenements")
      .delete()
      .eq("id", evenement.id);

    if (error) {
      setErreurSuppression(error.message);
      return;
    }
    await onSupprime(); // recharge la liste avant de revenir a l'accueil
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.retour}>
        &lt;- Retour
      </button>
      <h1 className={styles.titre}>{evenement.titre}</h1>
      <p className={styles.meta}>
        <span className={styles.categorie}>{evenement.categorie}</span>
      </p>
      <img
        src={evenement.image_url}
        alt={evenement.titre}
        className={styles.image}
      />
      <dl className={styles.infos}>
        <dt>Lieu</dt>
        <dd>{evenement.lieu_nom}</dd>
        <dt>Date</dt>
        <dd>{date}</dd>
        <dt>Prix</dt>
        <dd className={styles.prix}>{prix}</dd>
        <dt>Organise par</dt>
        <dd>{evenement.profiles ? evenement.profiles.nom : "Equipe SenEvent"}</dd>
      </dl>

      <BoutonInscription evenementId={evenement.id} session={session} />

      {estOrganisateur && (
        <button onClick={supprimer} className={styles.supprimer}>
          Supprimer cet evenement
        </button>
      )}
      {erreurSuppression && (
        <p className={styles.erreur}>Erreur : {erreurSuppression}</p>
      )}
    </div>
  );
};

export default Detail;
