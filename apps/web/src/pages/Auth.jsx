import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import styles from "./Auth.module.css";

const Auth = () => {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const navigate = useNavigate();

  const soumettre = async event => {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      if (mode === "signup") {
        // Le nom part dans raw_user_meta_data : le trigger on_auth_user_created
        // (Lab 5) le lit pour creer la ligne profiles dans la meme transaction.
        // Inserer nous-memes dans profiles ferait doublon avec le trigger.
        const { error } = await supabase.auth.signUp({
          email,
          password: motDePasse,
          options: { data: { nom } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: motDePasse,
        });
        if (error) throw error;
      }
      navigate("/");
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={soumettre}>
      <h2>{mode === "signup" ? "Creer un compte" : "Se connecter"}</h2>

      {mode === "signup" && (
        <label className={styles.champ}>
          Nom d'affichage
          <input
            type="text"
            value={nom}
            onChange={e => setNom(e.target.value)}
            required
          />
        </label>
      )}

      <label className={styles.champ}>
        Email
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </label>

      <label className={styles.champ}>
        Mot de passe
        <input
          type="password"
          value={motDePasse}
          onChange={e => setMotDePasse(e.target.value)}
          minLength="6"
          required
        />
      </label>

      {erreur && <p className={styles.erreur}>{erreur}</p>}

      <button type="submit" disabled={enCours} className={styles.bouton}>
        {enCours
          ? "..."
          : mode === "signup"
          ? "Creer le compte"
          : "Se connecter"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        className={styles.basculer}
      >
        {mode === "signup"
          ? "Deja un compte ? Se connecter"
          : "Pas encore de compte ? Creer"}
      </button>
    </form>
  );
};

export default Auth;
