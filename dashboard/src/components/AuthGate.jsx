import React, { useState, useEffect } from 'react';
import { auth, githubProvider, isConfigured } from '../firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged, GithubAuthProvider } from 'firebase/auth';
import { Shield, LogOut, Loader2, AlertTriangle } from 'lucide-react';

/**
 * AuthGate — wraps the entire app.
 * If Firebase is configured and user is not signed in, shows a GitHub sign-in screen.
 * If Firebase is not configured, passes user=null and lets the app run in local-only mode.
 * children is a render-prop: children({ user, handleSignOut })
 */
export default function AuthGate({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [signingIn, setSigningIn] = useState(false);
    const [error, setError] = useState(null);
    const [guestMode, setGuestMode] = useState(false);

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
        if (!auth || !githubProvider) return;
        setSigningIn(true);
        setError(null);
        try {
            const res = await signInWithPopup(auth, githubProvider);
            const credential = GithubAuthProvider.credentialFromResult(res);
            if (credential?.accessToken) {
                localStorage.setItem('github_token', credential.accessToken);
            }
            if (res?.user) {
                fetch('/api/auth/sync-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: res.user.uid,
                        github_username: res.user.reloadUserInfo?.screenName || res.user.displayName || 'GitHub User'
                    })
                }).catch(err => console.error('Failed to sync user to Firestore:', err));
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        localStorage.removeItem('github_token');
        if (auth) await signOut(auth);
        setUser(null);
    };

    // Firebase not configured or user chose guest mode — bypass auth, run in local mode
    if (!isConfigured || guestMode) {
        return children({ user: null, handleSignIn: () => setGuestMode(false), handleSignOut: () => {} });
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
                <Loader2 className="text-cyan-400 animate-spin" size={32} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
                            <Shield size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">H-XKER</h1>
                            <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Security Engine</p>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-white mb-2">Sign in to continue</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Authenticate with GitHub to access the automated vulnerability patching dashboard, scan history, and AI-assisted mode.
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-xl font-mono">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            id="btn-github-signin"
                            onClick={handleSignIn}
                            disabled={signingIn}
                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3.5 px-6 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg text-sm"
                        >
                            {signingIn
                                ? <Loader2 size={18} className="animate-spin" />
                                : (
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                    </svg>
                                )}
                            {signingIn ? 'Signing in...' : 'Continue with GitHub'}
                        </button>

                        <p className="text-center text-xs text-gray-600 leading-relaxed">
                            We only request <code className="text-cyan-400 font-mono">read:user</code> scope.
                            Your repository access is not required.
                        </p>

                        <button
                            id="btn-guest-mode"
                            onClick={() => setGuestMode(true)}
                            className="w-full text-center text-xs text-gray-400 hover:text-cyan-400 font-mono py-2.5 transition-colors border border-gray-800 rounded-xl hover:border-gray-700 bg-gray-900/40"
                        >
                            Continue as Guest (Local Mode) →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return children({ user, handleSignIn, handleSignOut });
}