# V.TAL OBRAS - TELEMONT GROUP

Sistema web de gerenciamento e acompanhamento de registros de obras e medições.

---

## 🚀 Deploy no Netlify

Este projeto é uma aplicação SPA desenvolvida em **React** e **Vite**, pronta para deploy contínuo no **Netlify**.

### Passo a Passo para Deploy:

1. Acesse sua conta no [Netlify](https://app.netlify.com/).
2. Clique em **"Add new site"** → **"Import an existing project"** (ou *New site from Git*).
3. Selecione **GitHub** e escolha o repositório deste projeto.
4. As configurações de build serão detectadas automaticamente pelo arquivo `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Em **Environment variables** (Variáveis de Ambiente), configure as seguintes variáveis:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_DATABASE_ID` (opcional / padrão: `(default)`)
6. Clique em **"Deploy site"**.
