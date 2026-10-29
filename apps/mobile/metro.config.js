// Configuration Metro pour le monorepo SenEvent.
// Sans ce fichier, Metro part de la racine du depot (a cause des workspaces npm
// qui hissent node_modules) et n'arrive pas a resoudre le point d'entree de l'app.
const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const modulesApp = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tout le monorepo : packages/shared doit declencher un reload.
config.watchFolders = [...new Set([...config.watchFolders, workspaceRoot])];

// 2. Chercher les modules dans apps/mobile puis a la racine (ou npm les a hisses).
config.resolver.nodeModulesPaths = [
  modulesApp,
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Les versions de l'app passent avant celles de la racine.
//    npm a hisse a la racine d'autres versions de react, react-native et expo
//    (tirees par les peer dependencies). Un paquet hisse comme
//    react-native-screens trouverait ces copies-la en remontant l'arborescence :
//    deux React dans le meme bundle, et l'app plante.
//    Au Lab 8, on coupait donc toute remontee (disableHierarchicalLookup). Mais
//    expo-router range ses propres dependances dans des node_modules imbriques
//    (expo-router/node_modules/@react-navigation/bottom-tabs/node_modules/...)
//    que Metro ne voyait alors plus. D'ou la regle : resolution normale, sauf
//    pour un paquet installe dans apps/mobile, qui est toujours pris la.
const installeDansApp = new Map();
const nomDuPaquet = (module) =>
  module.split("/").slice(0, module.startsWith("@") ? 2 : 1).join("/");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const estUnPaquet = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  if (estUnPaquet) {
    const paquet = nomDuPaquet(moduleName);
    if (!installeDansApp.has(paquet)) {
      installeDansApp.set(paquet, fs.existsSync(path.join(modulesApp, paquet)));
    }
    if (installeDansApp.get(paquet)) {
      // On resout comme si l'import venait d'un fichier de l'app elle-meme.
      return context.resolveRequest(
        { ...context, originModulePath: path.join(projectRoot, "package.json") },
        moduleName,
        platform
      );
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
