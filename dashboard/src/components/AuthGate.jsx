import React, { useState, useEffect } from 'react';
import { auth, githubProvider, isConfigured } from '../firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged, GithubAuthProvider } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { API_BASE } from '../apiConfig.js';

/**
 * AuthGate — manages GitHub authentication state and exposes handleSignIn / handleSignOut
 * to the LandingPage and Dashboard.
 */
export default function AuthGate({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        if (!isConfigured || !auth) {
            setAuthLoading(false);
            return;
        }
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);
        });
        return unsub;
    }, []);

    const handleSignIn = async () => {
        if (!auth || !githubProvider) {
            alert("Firebase is not configured! Please ensure VITE_FIREBASE_API_KEY is in dashboard/.env and restart the Vite server (npm run dev).");
            return;
        }
        try {
            const res = await signInWithPopup(auth, githubProvider);
            const credential = GithubAuthProvider.credentialFromResult(res);
            if (credential?.accessToken) {
                localStorage.setItem('github_token', credential.accessToken);
            }
            if (res?.user) {
                fetch(`${API_BASE}/api/auth/sync-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: res.user.uid,
                        github_username: res.user.reloadUserInfo?.screenName || res.user.displayName || 'GitHub User'
                    })
                }).catch(err => console.error('Failed to sync user to Firestore:', err));
            }
        } catch (e) {
            console.error('Sign-in error:', e.message);
            if (e.code === 'auth/popup-closed-by-user') {
                alert("Sign in was cancelled. You must complete the GitHub login to access the dashboard.");
            } else {
                alert(`Sign in failed: ${e.message}`);
            }
        }
    };

    const handleSignOut = async () => {
        localStorage.removeItem('github_token');
        if (auth) await signOut(auth);
        setUser(null);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="text-blue-600 animate-spin" size={36} />
            </div>
        );
    }

    return children({ user, handleSignIn, handleSignOut });
}