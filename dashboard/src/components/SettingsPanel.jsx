import React, { useState, useEffect } from 'react';
import { X, Key, Trash2, Save, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

export default function SettingsPanel({ user, onClose, mode, onModeChange, onSignIn }) {
    const [groqKey, setGroqKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [savedKeyMask, setSavedKeyMask] = useState(null);
    const [hasSavedKey, setHasSavedKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [feedback, setFeedback] = useState(null); // { ok: bool, msg: string }
    const [localMode, setLocalMode] = useState(mode || 'deterministic');

    // Load key status on open
    useEffect(() => {
        const uid = user?.uid || 'local';
        fetch(`${API_BASE}/api/auth/key-status/${uid}`)
            .then(r => r.json())
            .then(d => {
                setHasSavedKey(!!d.hasSavedKey);
                setSavedKeyMask(d.maskedKey || null);
            })
            .catch(() => {});
    }, [user]);

    const handleSaveKey = async () => {
        if (!groqKey.trim()) return;
        setSaving(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE}/api/auth/save-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // plainKey is sent once to the backend; backend encrypts it immediately.
                // It is never returned to the frontend in any subsequent request.
                body: JSON.stringify({ userId: user?.uid || 'local', plainKey: groqKey.trim() }),
            });
            const d = await res.json();
            if (res.ok) {
                setFeedback({ ok: true, msg: 'Key encrypted and saved. ' + (d.maskedKey || '') });
                setSavedKeyMask(d.maskedKey);
                setHasSavedKey(true);
                setGroqKey(''); // clear from memory
            } else {
                setFeedback({ ok: false, msg: d.error || 'Failed to save key.' });
            }
        } catch (e) {
            setFeedback({ ok: false, msg: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveKey = async () => {
        if (!window.confirm('Remove your saved Groq API key? You will need to re-enter it to use AI-assisted mode.')) return;
        setRemoving(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/remove-key`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.uid || 'local' }),
            });
            if (res.ok) {
                setHasSavedKey(false);
                setSavedKeyMask(null);
                setFeedback({ ok: true, msg: 'API key removed successfully.' });
                if (localMode === 'ai_assisted') {
                    setLocalMode('deterministic');
                    onModeChange('deterministic');
                }
            }
        } catch (e) {
            setFeedback({ ok: false, msg: e.message });
        } finally {
            setRemoving(false);
        }
    };

    const handleModeChange = (newMode) => {
        setLocalMode(newMode);
        onModeChange(newMode);
        const uid = user?.uid;
        if (uid) {
            fetch(`${API_BASE}/api/auth/save-mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: uid, mode: newMode }),
            }).catch(() => {});
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-end"
            style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="h-full w-full max-w-md bg-[#0f1320] border-l border-white/10 shadow-2xl flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-white font-bold text-lg">Settings</h2>
                    <button id="btn-settings-close" onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto">

                    {/* --- Account Section --- */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Account</h3>
                        {user ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-9 h-9 rounded-full border border-cyan-500/30" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center font-bold text-cyan-300">
                                        {user.displayName?.[0] || 'U'}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-white">{user.displayName || 'GitHub User'}</p>
                                    <p className="text-xs text-gray-400 font-mono">@{user.reloadUserInfo?.screenName || 'github'}</p>
                                </div>
                                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30">
                                    SIGNED IN
                                </span>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/10 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-white">Guest Mode</span>
                                    <span className="ml-auto text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded font-mono">
                                        LOCAL
                                    </span>
                                </div>
                                <p className="text-xs text-gray-300">
                                    Sign in with GitHub to save Groq API keys and scan history to cloud storage.
                                </p>
                                <button
                                    id="btn-settings-signin"
                                    onClick={onSignIn}
                                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-xs shadow-md"
                                >
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                    </svg>
                                    Sign in with GitHub
                                </button>
                            </div>
                        )}
                    </section>

                    {/* --- Pipeline Mode --- */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Pipeline Mode</h3>
                        {[
                            {
                                id: 'deterministic',
                                label: 'Deterministic Pipeline',
                                emoji: '🔬',
                                desc: 'Direct backport then version bump. Fully deterministic — no AI, no network calls to external LLMs. Fastest and most predictable.',
                            },
                            {
                                id: 'ai_assisted',
                                label: 'AI-Assisted (Groq)',
                                emoji: '🤖',
                                desc: 'Same deterministic pipeline first. If both strategies fail for a package, calls Groq LLM as a fallback. AI patches go through the same full verification gauntlet — zero special trust.',
                            },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                id={`btn-mode-${opt.id}`}
                                onClick={() => handleModeChange(opt.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    localMode === opt.id
                                        ? 'border-cyan-500/60 bg-cyan-500/10 shadow-inner shadow-cyan-500/5'
                                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-1.5">
                                    <span className="text-lg leading-none">{opt.emoji}</span>
                                    <span className="font-semibold text-white text-sm">{opt.label}</span>
                                    {localMode === opt.id && (
                                        <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/20">
                                            ACTIVE
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed pl-8">{opt.desc}</p>
                            </button>
                        ))}
                    </section>

                    {/* --- Groq API Key --- */}
                    {localMode === 'ai_assisted' && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">Groq API Key</h3>

                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-xs leading-relaxed space-y-2">
                                <p className="font-semibold">🔐 How your key is protected</p>
                                <p>Your key is encrypted with AES-256-GCM before being stored in Firestore. It is never logged, never returned to your browser after saving, and is only decrypted server-side immediately before a Groq API call. We recommend using a free-tier key with rate limits set on Groq's side.</p>
                                <a
                                    href="https://console.groq.com/keys"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-amber-400 underline mt-1"
                                >
                                    Get a Groq API key <ExternalLink size={10} />
                                </a>
                            </div>

                            {hasSavedKey && savedKeyMask ? (
                                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-green-300 text-xs font-semibold mb-0.5">Key saved</p>
                                        <p className="text-gray-300 font-mono text-xs">{savedKeyMask}</p>
                                        <p className="text-gray-600 text-xs mt-0.5">Full key is not shown again — standard security practice.</p>
                                    </div>
                                    <button
                                        id="btn-remove-key"
                                        onClick={handleRemoveKey}
                                        disabled={removing}
                                        className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-mono transition-colors flex-shrink-0 disabled:opacity-50 p-2 rounded-lg hover:bg-red-500/10"
                                    >
                                        {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            id="input-groq-key"
                                            type={showKey ? 'text' : 'password'}
                                            placeholder="gsk_..."
                                            value={groqKey}
                                            onChange={e => setGroqKey(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-11 py-3 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        />
                                        <button
                                            onClick={() => setShowKey(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                                        >
                                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    <button
                                        id="btn-save-key"
                                        onClick={handleSaveKey}
                                        disabled={saving || !groqKey.trim()}
                                        className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-cyan-500/20"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {saving ? 'Encrypting & Saving...' : 'Encrypt & Save Key'}
                                    </button>
                                </div>
                            )}

                            {feedback && (
                                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                                    feedback.ok
                                        ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                                        : 'bg-red-500/10 border border-red-500/30 text-red-300'
                                }`}>
                                    {feedback.ok
                                        ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                                        : <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />}
                                    <span>{feedback.msg}</span>
                                </div>
                            )}
                        </section>
                    )}

                    {/* --- Account --- */}
                    {user && (
                        <section className="space-y-3">
                            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">Account</h3>
                            <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                                {user.photoURL && (
                                    <img src={user.photoURL} alt="avatar" className="w-9 h-9 rounded-full ring-2 ring-white/10" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-semibold truncate">{user.displayName || user.email || 'GitHub User'}</p>
                                    <p className="text-gray-500 text-xs truncate font-mono">{user.uid}</p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}