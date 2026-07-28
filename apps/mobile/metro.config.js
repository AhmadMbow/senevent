// Configuration Metro pour le monorepo SenEvent.
// Sans ce fichier, Metro part de la racine du depot (a cause des workspaces npm
// qui hissent node_modules) et n'arrive pas a resoudre le point d'entree de l'app.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tout le monorepo : packages/shared doit declencher un reload.
config.watchFolders = [workspaceRoot];

// 2. Chercher les modules dans apps/mobile puis a la racine (ou npm les a hisses).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Ne pas remonter l'arborescence au hasard : on garde les deux chemins ci-dessus.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
