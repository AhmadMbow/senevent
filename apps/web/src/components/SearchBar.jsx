import styles from "./SearchBar.module.css";

const SearchBar = ({ recherche, onRecherche }) => {
  return (
    <input
      type="search"
      className={styles.search}
      placeholder="Rechercher un evenement..."
      value={recherche}
      onChange={e => onRecherche(e.target.value)}
    />
  );
};

export default SearchBar;
