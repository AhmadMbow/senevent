"use strict";

(function () {
    const id = name => document.getElementById(name);

    const chargerEvenements = async () => {
        try {
            const response = await fetch("evenements.json");
            const evenements = await response.json();
            afficherEvenements(evenements);
        } catch (error) {
            id("liste").textContent = "Erreur de chargement.";
            console.error("Erreur :", error);
        }
    };

    const afficherEvenements = (evenements) => {
        const liste = id("liste");
        liste.innerHTML = "";
        evenements.forEach(ev => {
            const carte = document.createElement("div");
            carte.classList.add("carte");
            const prix = ev.prix === 0 ? "Gratuit" : `${ev.prix} FCFA`;
            carte.innerHTML = `
                <h3>${ev.titre}</h3>
                <p>Categorie : ${ev.categorie}</p>
                <p>Lieu : ${ev.lieu_nom}</p>
                <p>Prix : ${prix}</p>
            `;
            liste.appendChild(carte);
        });
    };

    const init = () => {
        id("btn-charger").addEventListener("click", chargerEvenements);
    };

    window.addEventListener("load", init);
})();
