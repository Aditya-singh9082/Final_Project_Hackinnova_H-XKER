import React, { useState, useEffect } from 'react';
import { Key, Lock, Check, X, ShieldAlert, Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import { saveUserGroqKey, getUserGroqKey } from '../firebase.js';

export default function SettingsPanel({ isOpen, onClose, user, onSignOut }) {
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
        }
        if (!isOpen) {
            setConfirmDelete(false);
            setDeleteError(null);
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

    const handleDeleteAccount = async () => {
        if (!user?.uid) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            // 1. Delete Firestore data via server endpoint
            await fetch('/api/auth/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid })
            });

            // 2. Delete Firebase auth user
            try {
                await user.delete();
            } catch (authErr) {
                // If requires recent login, sign out anyway after clearing data
                console.warn('Auth delete required reauth, signing out:', authErr);
            }

            // 3. Close modal and trigger sign out
            onClose();
            if (onSignOut) onSignOut();
        } catch (e) {
            setDeleteError(e.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-heading font-bold text-slate-900">AI API Key & Settings</h3>
                            <p className="text-xs text-slate-500 font-mono">Manage your account & credentials</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono font-semibold uppercase text-slate-700 mb-2">
                            Groq API Key (gsk_...)
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                    </div>

                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        Your key is encrypted on the server before being saved to your Firestore profile. It is used exclusively when AI-assisted patch generation is required.
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

                    {/* Danger Zone: Delete Account */}
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

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-heading font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>Save Key</span>
                    </button>
                </div>
            </div>
        </div>
    );
}