import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import styles from "./NouvelEvenement.module.css";

const NouvelEvenement = ({ onAjoutReussi }) => {
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("concert");
  const [lieu, setLieu] = useState("");
  const [prix, setPrix] = useState(0);
  const [fichier, setFichier] = useState(null);
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const navigate = useNavigate();

  // Validation cote client : confort immediat, pas une securite. Les memes
  // regles sont dupliquees en base par les contraintes check du Lab 5.
  const valider = () => {
    const e = {};
    if (titre.trim().length < 3) {
      e.titre = "Le titre doit contenir au moins 3 caracteres.";
    }
    if (lieu.trim().length < 2) {
      e.lieu = "Le lieu est requis.";
    }
    if (prix < 0) {
      e.prix = "Le prix ne peut pas etre negatif.";
    }
    return e;
  };

  const soumettre = async event => {
    event.preventDefault();
    setErreurServeur(null);

    const erreursTrouvees = valider();
    if (Object.keys(erreursTrouvees).length > 0) {
      setErreurs(erreursTrouvees);
      return;
    }
    setErreurs({});
    setEnCours(true);

    // La policy RLS exige organisateur_id = auth.uid() : on recupere l'utilisateur.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErreurServeur("Vous devez etre connecte.");
      setEnCours(false);
      return;
    }

    // Bonus Storage : on televerse l'affiche AVANT l'insert, pour connaitre son
    // URL publique. Le chemin commence par l'uid, ce qu'exige la policy
    // "affiches_insert_auth" (migration 006). A defaut de fichier, placeholder.
    let image_url = `https://placehold.co/400x250/1a3a5c/fff?text=${categorie}`;
    if (fichier) {
      const chemin = `${user.id}/${Date.now()}_${fichier.name}`;
      const { error: erreurUpload } = await supabase.storage
        .from("affiches")
        .upload(chemin, fichier);
      if (erreurUpload) {
        setErreurServeur(erreurUpload.message);
        setEnCours(false);
        return;
      }
      // getPublicUrl est synchrone : il construit l'URL, sans appel reseau.
      const { data: urlData } = supabase.storage
        .from("affiches")
        .getPublicUrl(chemin);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("evenements").insert({
      titre: titre.trim(),
      categorie,
      lieu_nom: lieu.trim(),
      prix: Number(prix),
      date_debut: new Date().toISOString(),
      image_url,
      organisateur_id: user.id,
    });

    setEnCours(false);

    if (error) {
      setErreurServeur(error.message);
      return;
    }

    await onAjoutReussi(); // demande a App de recharger la liste depuis la base
    navigate("/"); // Retour a l'accueil apres ajout
  };

  return (
    <form className={styles.form} onSubmit={soumettre}>
      <h2>Ajouter un evenement</h2>

      <label className={styles.champ}>
        Titre
        <input
          type="text"
          value={titre}
          onChange={e => setTitre(e.target.value)}
        />
        {erreurs.titre && <span className={styles.erreur}>{erreurs.titre}</span>}
      </label>

      <label className={styles.champ}>
        Categorie
        <select value={categorie} onChange={e => setCategorie(e.target.value)}>
          <option value="concert">Concert</option>
          <option value="expo">Exposition</option>
          <option value="conference">Conference</option>
          <option value="atelier">Atelier</option>
          <option value="soutenance">Soutenance</option>
        </select>
      </label>

      <label className={styles.champ}>
        Lieu
        <input
          type="text"
          value={lieu}
          onChange={e => setLieu(e.target.value)}
        />
        {erreurs.lieu && <span className={styles.erreur}>{erreurs.lieu}</span>}
      </label>

      <label className={styles.champ}>
        Prix (FCFA, 0 pour gratuit)
        <input
          type="number"
          min="0"
          value={prix}
          onChange={e => setPrix(e.target.value)}
        />
        {erreurs.prix && <span className={styles.erreur}>{erreurs.prix}</span>}
      </label>

      <label className={styles.champ}>
        Affiche (optionnel)
        <input
          type="file"
          accept="image/*"
          onChange={e => setFichier(e.target.files[0] ?? null)}
        />
        <span className={styles.aide}>
          Sans fichier, une image par defaut est utilisee.
        </span>
      </label>

      {erreurServeur && (
        <p className={styles.erreur}>Erreur : {erreurServeur}</p>
      )}

      <button type="submit" className={styles.bouton} disabled={enCours}>
        {enCours ? "Envoi..." : "Ajouter"}
      </button>
    </form>
  );
};

export default NouvelEvenement;
