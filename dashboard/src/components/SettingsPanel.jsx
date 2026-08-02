import React, { useState, useEffect } from 'react';
import { Key, Lock, Check, X, ShieldAlert, Loader2, Save, Trash2, AlertTriangle, Cpu, Zap, Server } from 'lucide-react';
import { saveUserGroqKey, getUserGroqKey } from '../firebase.js';

const AI_PROVIDERS = [
    {
        id: 'puter',
        name: 'Puter.dev (Free)',
        model: 'gpt-5.6-sol',
        description: 'Flagship OpenAI model via Puter.dev — no API key required, completely free.',
        color: 'blue',
        icon: Zap,
        requiresKey: false,
    },
    {
        id: 'groq',
        name: 'Groq (Own Key)',
        model: 'llama-3.3-70b-versatile',
        description: 'Uses your personal Groq API key. Fast inference with Llama 3.3 70B.',
        color: 'orange',
        icon: Key,
        requiresKey: true,
    },
    {
        id: 'deterministic',
        name: 'Deterministic Only',
        model: 'None (no AI)',
        description: 'Only use automated version bumps. No AI fallback if deterministic patching fails.',
        color: 'slate',
        icon: Server,
        requiresKey: false,
    },
];

export default function SettingsPanel({ isOpen, onClose, user, onSignOut, onProviderChange }) {
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedProvider, setSelectedProvider] = useState('puter');
    const [providerSaving, setProviderSaving] = useState(false);
    const [providerSaved, setProviderSaved] = useState(false);

    const [commitMode, setCommitMode] = useState('manual_review');
    const [commitModeSaving, setCommitModeSaving] = useState(false);
    const [commitModeSaved, setCommitModeSaved] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    useEffect(() => {
        if (isOpen && user?.uid) {
            setLoading(true);
            getUserGroqKey(user.uid)
                .then(key => {
                    if (key) setApiKey(key);
                })
                .catch(e => console.error(e))
                .finally(() => setLoading(false));

            // Load saved provider preference
            fetch(`/api/auth/get-provider/${encodeURIComponent(user.uid)}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.provider) setSelectedProvider(data.provider);
                })
                .catch(() => {});

            // Load saved commit mode preference
            fetch(`/api/auth/get-commit-mode/${encodeURIComponent(user.uid)}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.commitMode) setCommitMode(data.commitMode);
                })
                .catch(() => {});
        }
        if (!isOpen) {
            setConfirmDelete(false);
            setDeleteError(null);
            setProviderSaved(false);
            setCommitModeSaved(false);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!user?.uid) return;
        setSaving(true);
        setError(null);
        try {
            await saveUserGroqKey(user.uid, apiKey.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleProviderSelect = async (providerId) => {
        setSelectedProvider(providerId);
        if (!user?.uid) return;
        setProviderSaving(true);
        try {
            await fetch('/api/auth/save-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, provider: providerId })
            });
            setProviderSaved(true);
            setTimeout(() => setProviderSaved(false), 3000);
            if (onProviderChange) onProviderChange(providerId);
        } catch (e) {
            console.error('Failed to save provider preference:', e);
        } finally {
            setProviderSaving(false);
        }
    };

    const handleCommitModeSelect = async (mode) => {
        setCommitMode(mode);
        if (!user?.uid) return;
        setCommitModeSaving(true);
        try {
            await fetch('/api/auth/save-commit-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, commitMode: mode })
            });
            setCommitModeSaved(true);
            setTimeout(() => setCommitModeSaved(false), 3000);
        } catch (e) {
            console.error('Failed to save commit mode:', e);
        } finally {
            setCommitModeSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user?.uid) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await fetch('/api/auth/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid })
            });

            try {
                await user.delete();
            } catch (authErr) {
                console.warn('Auth delete required reauth, signing out:', authErr);
            }

            onClose();
            if (onSignOut) onSignOut();
        } catch (e) {
            setDeleteError(e.message);
        } finally {
            setDeleting(false);
        }
    };

    const activeProvider = AI_PROVIDERS.find(p => p.id === selectedProvider) || AI_PROVIDERS[0];

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-heading font-bold text-slate-900">Settings</h3>
                            <p className="text-xs text-slate-500 font-mono">AI Provider, API Keys & Account</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* ========== AI PROVIDER SELECTOR ========== */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-mono font-semibold uppercase text-slate-700">
                            AI Patch Provider
                        </label>
                        {providerSaved && (
                            <span className="text-xs text-emerald-600 font-mono flex items-center gap-1">
                                <Check size={12} /> Saved
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-sans leading-relaxed -mt-1">
                        Choose which AI model generates patch suggestions when automated version bumps fail.
                    </p>

                    <div className="space-y-2">
                        {AI_PROVIDERS.map(provider => {
                            const Icon = provider.icon;
                            const isActive = selectedProvider === provider.id;
                            const colorMap = {
                                blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: 'text-blue-600', ring: 'ring-blue-500/20', activeBg: 'bg-blue-600' },
                                orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: 'text-orange-600', ring: 'ring-orange-500/20', activeBg: 'bg-orange-600' },
                                slate: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', icon: 'text-slate-600', ring: 'ring-slate-500/20', activeBg: 'bg-slate-600' },
                            };
                            const c = colorMap[provider.color] || colorMap.slate;

                            return (
                                <button
                                    key={provider.id}
                                    onClick={() => handleProviderSelect(provider.id)}
                                    disabled={providerSaving}
                                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                                        isActive
                                            ? `${c.bg} ${c.border} ring-2 ${c.ring}`
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                            isActive ? `${c.activeBg} text-white` : `bg-slate-100 ${c.icon}`
                                        }`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-heading font-bold ${isActive ? c.text : 'text-slate-800'}`}>
                                                    {provider.name}
                                                </span>
                                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                                    {provider.model}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                                {provider.description}
                                            </p>
                                        </div>
                                        {/* Radio indicator */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                                            isActive ? `${c.border}` : 'border-slate-300'
                                        }`}>
                                            {isActive && (
                                                <div className={`w-2.5 h-2.5 rounded-full ${c.activeBg}`} />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ========== GROQ API KEY INPUT (only visible when groq is selected) ========== */}
                {selectedProvider === 'groq' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-mono font-semibold uppercase text-slate-700 mb-2">
                                Groq API Key (gsk_...)
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            />
                        </div>

                        <p className="text-xs text-slate-500 font-sans leading-relaxed">
                            Your key is encrypted with AES-256-GCM on the server before being saved to Firestore. It is used exclusively for AI-assisted patch generation.
                        </p>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                                {error}
                            </div>
                        )}

                        {saved && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                                <Check size={16} />
                                <span>API Key encrypted and saved to Firestore!</span>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving || loading || !apiKey.trim()}
                                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                <span>Save Key</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== PATCH COMMIT STRATEGY ========== */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-mono font-semibold uppercase text-slate-700">
                            Default Patch Commit Strategy
                        </label>
                        {commitModeSaved && (
                            <span className="text-xs text-emerald-600 font-mono flex items-center gap-1">
                                <Check size={12} /> Saved
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-sans leading-relaxed -mt-1">
                        Choose whether clean patches require manual inspection or automatically commit and create pull requests.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleCommitModeSelect('manual_review')}
                            disabled={commitModeSaving}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                commitMode === 'manual_review'
                                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <span className="text-xs font-heading font-bold block">
                                Require Review (Manual)
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                                Always inspect patch diff and PR markdown before committing.
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleCommitModeSelect('auto_commit')}
                            disabled={commitModeSaving}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                commitMode === 'auto_commit'
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <span className="text-xs font-heading font-bold block">
                                Auto-Commit & Auto-PR
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                                Automatically stage, commit & publish PRs when safety checks pass.
                            </span>
                        </button>
                    </div>
                </div>

                {/* ========== DANGER ZONE: DELETE ACCOUNT ========== */}
                <div className="pt-4 border-t border-red-100">
                    <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-heading font-bold text-red-900 flex items-center gap-1.5">
                                <Trash2 size={15} className="text-red-600" />
                                <span>Delete Account</span>
                            </h4>
                            <p className="text-xs text-red-700/80 font-sans mt-0.5">
                                Permanently remove your Firestore profile, encrypted API key, and scan history.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="bg-red-600 hover:bg-red-700 text-white font-heading font-semibold text-xs px-3.5 py-2 rounded-lg shrink-0 shadow-sm transition-all cursor-pointer"
                        >
                            Delete Account
                        </button>
                    </div>

                    {deleteError && (
                        <div className="mt-2 p-2.5 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800">
                            {deleteError}
                        </div>
                    )}

                    {confirmDelete && (
                        <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-red-800 font-heading font-bold text-sm">
                                <AlertTriangle size={18} className="text-red-600" />
                                <span>Confirm Account Deletion</span>
                            </div>
                            <p className="text-xs text-red-700 font-sans leading-relaxed">
                                This action cannot be undone. All your scan records and saved API keys will be deleted immediately.
                            </p>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-3 py-1.5 text-xs font-heading font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={deleting}
                                    className="bg-red-600 hover:bg-red-700 text-white font-heading font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                    {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                                    <span>Yes, Delete My Account</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}