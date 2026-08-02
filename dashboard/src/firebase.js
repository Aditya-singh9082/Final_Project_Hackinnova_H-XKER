/**
 * firebase.js — Firebase Client SDK initialization & Firestore Helper Methods
 * Uses VITE_ environment variables from dashboard/.env (public config only — no secrets).
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { API_BASE } from './apiConfig.js';

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

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;
export const githubProvider = isConfigured ? new GithubAuthProvider() : null;

if (isConfigured) {
    githubProvider.addScope('read:user');
    githubProvider.addScope('repo');
} else {
    console.warn(
        '[firebase] Not configured. Fill in dashboard/.env to enable GitHub auth and Firestore.'
    );
}

/**
 * Fetch scan history from Firestore for a specific user
 */
export async function getScanHistories(userId, limitCount = 50) {
    if (!db) return [];
    try {
        const q = query(
            collection(db, 'scan_history'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => !userId || userId === 'local' || d.userId === userId || d.userId === 'local' || !d.userId);
        return docs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    } catch (e) {
        console.error('Error fetching scan history from Firestore:', e);
        return [];
    }
}

/**
 * Save user Groq API Key via the server's encrypted key storage endpoint
 */
export async function saveUserGroqKey(userId, apiKey) {
    if (!userId) throw new Error('User not authenticated');
    try {
        const res = await fetch(`${API_BASE}/api/auth/save-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, plainKey: apiKey })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to save API key');
        }
        return await res.json();
    } catch (e) {
        console.error('Error saving API key:', e);
        throw e;
    }
}

/**
 * Get user Groq API Key status (masked — server never returns plaintext)
 */
export async function getUserGroqKey(userId) {
    if (!userId) return null;
    try {
        const res = await fetch(`/api/auth/key-status/${encodeURIComponent(userId)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.hasSavedKey) {
                return data.maskedKey || '••••••••(saved)';
            }
        }
        return null;
    } catch (e) {
        console.error('Error getting API key status:', e);
        return null;
    }
}

export { auth, githubProvider, isConfigured, db };