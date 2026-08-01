/**
 * firebase.js — Firebase Client SDK initialization
 * Uses VITE_ environment variables from dashboard/.env (public config only — no secrets).
 * Import { auth, githubProvider, isConfigured } wherever GitHub sign-in is needed.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'YOUR_FIREBASE_PROJECT_ID'
);

let auth = null;
let githubProvider = null;

if (isConfigured) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    githubProvider = new GithubAuthProvider();
    githubProvider.addScope('read:user');
    githubProvider.addScope('repo');
} else {
    console.warn(
        '[firebase] Not configured. Fill in dashboard/.env to enable GitHub auth. ' +
        'App will run in local-only mode.'
    );
}

export { auth, githubProvider, isConfigured };