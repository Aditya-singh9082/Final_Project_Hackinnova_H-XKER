# Deployment Guide — Netlify (Frontend) + Firebase (Backend & Database)

This project is configured for hybrid cloud deployment:
- **Frontend**: Hosted on **Netlify** (Vite + React SPA)
- **Backend & Database**: Hosted on **Firebase** (Express API via Firebase Cloud Functions + Firestore Database & Auth)

---

## 🌐 Part 1: Deploying the Frontend to Netlify

### Step 1: Import Project into Netlify
1. Log in to your [Netlify Dashboard](https://app.netlify.com/).
2. Click **"Add new site"** ➔ **"Import an existing project"**.
3. Choose **GitHub** and authorize access to `Aditya-singh9082/Final_Project_Hackinnova_H-XKER`.

### Step 2: Configure Build Settings
Fill in the deployment settings:
- **Base directory**: `dashboard`
- **Build command**: `npm run build`
- **Publish directory**: `dashboard/dist`
- **Functions directory**: *(leave empty)*

### Step 3: Set Environment Variables on Netlify
In Netlify, navigate to **Site configuration ➔ Environment variables** and add:

| Environment Variable Key | Description |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Your Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `your-sender-id` |
| `VITE_FIREBASE_APP_ID` | `your-app-id` |

> 💡 **Routing note**: SPA routing rules are pre-configured in `dashboard/public/_redirects` and `dashboard/netlify.toml` so page refreshes never cause 404 errors.

---

## 🔥 Part 2: Hosting Backend on Firebase

Your project includes `firebase.json` pre-configured to wrap the Express backend server (`dashboard/server.cjs`) as a Firebase Cloud Function.

### Step 1: Install Firebase CLI
If you haven't installed `firebase-tools`, run:
```bash
npm install -g firebase-tools
```

### Step 2: Login & Connect Existing Firebase Project
```bash
firebase login
firebase use --add
```
Select your existing Firebase project (`Final_Project_Hackinnova_H-XKER` or your active project ID).

### Step 3: Deploy Backend & Functions
Run the following command from the repository root:
```bash
firebase deploy --only functions,hosting
```

Once deployed, Firebase will output your Cloud Function HTTPS URL (e.g., `https://us-central1-YOUR-PROJECT.cloudfunctions.net/api`).

---

## 🔑 Part 3: Firebase Authentication & GitHub OAuth Setup

Ensure your existing Firebase Project has:
1. **GitHub Provider Enabled**:
   - Go to **Firebase Console ➔ Authentication ➔ Sign-in method ➔ Add new provider ➔ GitHub**.
   - Copy the **Authorization callback URL** from Firebase and register an OAuth app in GitHub (**Developer Settings ➔ OAuth Apps**).
   - Enter your GitHub Client ID & Secret in Firebase Console.
2. **Authorized Domains**:
   - Under **Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains**, add your Netlify domain (e.g. `your-app.netlify.app`).

---

## ⚡ Verification Checklist
- [x] Netlify SPA routing rules configured (`dashboard/public/_redirects`).
- [x] `dashboard/netlify.toml` build configuration file created.
- [x] `firebase.json` hosting and functions rewrites initialized.
- [x] Backend Express `server.cjs` exported for serverless cloud handlers.
