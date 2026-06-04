import styles from "./SearchBar.module.css";

const SearchBar = ({ recherche, onRecherche }) => {
  return (
    <div className={styles.conteneur}>
      <input
        className={styles.input}
        type="text"
        placeholder="Rechercher un evenement..."
        value={recherche}
        onChange={e => onRecherche(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
