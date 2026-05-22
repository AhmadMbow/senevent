"use strict";

(function () {
    const id = name => document.getElementById(name);
    const qs = selector => document.querySelector(selector);

    const change = () => {
        qs("p").style.color = "red";
        qs("h2").style.color = "blue";
    };

    const init = () => {
        id("b1").addEventListener("click", change);
    };

    window.addEventListener("load", init);
})();
