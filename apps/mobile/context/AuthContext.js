import { createContext, useContext, useState, useEffect } from "react";
import { getSupabase } from "@senevent/shared";

// La session, partagee par tous les ecrans sans passer de props.
// Au Lab 5, App.jsx la detenait et la donnait a NavBar et Detail. Avec Expo
// Router, les ecrans sont rendus par le routeur : l'onglet Profil et l'ecran
// de detail n'ont pas de parent commun qui pourrait la leur transmettre.

// Le contexte : valeur par defaut avant tout chargement
const AuthContext = createContext({ session: null, chargement: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Recuperer la session au demarrage
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setChargement(false);
      });

    // Ecouter les changements (login, logout, refresh du token)
    const { data: sub } = getSupabase().auth.onAuthStateChange(
      (_event, nouvelleSession) => setSession(nouvelleSession)
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, chargement }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook pratique pour lire la session depuis n'importe quel ecran
export function useAuth() {
  return useContext(AuthContext);
}
