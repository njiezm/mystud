# 📚 Plateforme d'Étude Personnelle

Bienvenue sur la plateforme d'étude personnelle, une application web minimaliste et performante conçue pour organiser vos matières, vos notes et vos ressources de cours.

Cette application est entièrement basée sur le navigateur, utilisant React pour l'interface utilisateur et **LocalStorage** pour la persistance des données (notes, matières, et fichiers déposés en Base64).

## ✨ Fonctionnalités Principales

* **Gestion des Matières :** Créez, renommez et supprimez vos différents cours (Matières).

* **Notes Persistantes :** Prenez des notes par matière, sauvegardées automatiquement dans le stockage local du navigateur.

* **Dépôt de Ressources :** Ajoutez des ressources (PDF, images, documents) directement dans l'application.

  * **Persistance Fichier :** Les fichiers sont encodés en Base64 et stockés dans le \`localStorage\`, garantissant leur persistance entre les sessions.

  * **Limite de Taille :** La taille maximale de dépôt est fixée à **5 Mo** par fichier, en raison des limites techniques du \`localStorage\` des navigateurs.

* **Gestion des Devoirs :** Simulez l'ajout de devoirs pour suivre votre progression.

* **Interface Réactive :** Conçu avec Tailwind CSS pour une expérience utilisateur fluide sur mobile et desktop.

## 🛠️ Stack Technique

* **Frontend :** React (via Vite)

* **Styling :** Tailwind CSS

* **Icônes :** Lucide React

* **Persistance :** \`localStorage\` (Stockage local du navigateur)

## 🚀 Guide de Démarrage Local

Suivez ces étapes pour lancer l'application sur votre machine de développement.

### Prérequis

Assurez-vous d'avoir [Node.js](https://nodejs.org/en/) et [npm](https://www.npmjs.com/) installés.

### 1. Initialisation du Projet

Si vous avez utilisé la méthode recommandée avec Vite :

\`\`\`bash
# 1. Créer le projet (si ce n'est pas déjà fait)
npm create vite@latest plateforme-etude -- --template react

# 2. Naviguer vers le répertoire du projet
cd plateforme-etude
\`\`\`

### 2. Installation des Dépendances

Installez toutes les bibliothèques requises, y compris \`lucide-react\` et Tailwind CSS.

\`\`\`bash
npm install
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
\`\`\`

### 3. Configuration de Tailwind CSS

Assurez-vous que les fichiers de configuration de Tailwind sont correctement mis à jour pour scanner vos fichiers React :

* **Copiez le contenu** de votre code (\`App.jsx\`) dans \`src/App.jsx\`.

* **Mettez à jour \`tailwind.config.js\`** pour inclure le chemin des fichiers \`.jsx\` :

  \`\`\`javascript
  // tailwind.config.js
  module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // IMPORTANT: Inclut les fichiers React
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  \`\`\`

* **Mettez à jour \`src/index.css\`** avec les directives Tailwind :

  \`\`\`css
  /* src/index.css */
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  \`\`\`

### 4. Lancement de l'Application

Démarrez le serveur de développement.

\`\`\`bash
npm run dev
\`\`\`

L'application sera accessible localement, généralement sur \`http://localhost:5173\`.

## 🌐 Déploiement sur Vercel

Le déploiement est rapide et automatisé, car Vercel reconnaît nativement les projets Vite/React.

1. **Créez et Poussez le code sur GitHub :**

   \`\`\`bash
   git init
   git add .
   git commit -m "feat: initial project setup and app logic"
   
   # Ajoutez l'origine distante (lien vers votre dépôt GitHub)
   git remote add origin https://github.com/VOTRE_NOM_UTILISATEUR/plateforme-etude.git
   git push -u origin main
   \`\`\`

2. **Connectez-vous à Vercel** (ou créez un compte via GitHub).

3. **Importez un nouveau projet** en sélectionnant le dépôt GitHub \`plateforme-etude\`.

4. Laissez les paramètres de *Build* par défaut (\`npm run build\` et *Output Directory* \`dist\`).

5. Cliquez sur **Deploy**.

Chaque \`git push\` sur la branche \`main\` déclenchera un redéploiement automatique sur Vercel.

## ⚠️ Note sur la Persistance (LocalStorage)

Ce projet utilise le \`localStorage\` pour la persistance simple.

* **Avantages :** Zéro serveur, données instantanément disponibles, gratuit.

* **Inconvénients :** Les données sont limitées (max 5-10 Mo total) et **uniquement stockées sur l'appareil et le navigateur que vous utilisez**. Si vous changez d'ordinateur ou de navigateur, les données ne vous suivront pas. Pour un stockage multi-appareil, une base de données cloud (comme Firebase Firestore ou Supabase) serait nécessaire.
