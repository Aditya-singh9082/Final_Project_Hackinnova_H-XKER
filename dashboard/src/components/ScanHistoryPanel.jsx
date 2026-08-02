import React, { useState, useEffect } from 'react';
import { History, Shield, CheckCircle, AlertTriangle, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { getScanHistories } from '../firebase.js';

export default function ScanHistoryPanel({ user, onSelectHistory }) {
    const [histories, setHistories] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        try {
            const uid = user?.uid || 'local';
            const data = await getScanHistories(uid, 50);
            setHistories(data);
        } catch (e) {
            console.error('Failed to load scan history:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
        const interval = setInterval(loadHistory, 4000);
        return () => clearInterval(interval);
    }, [user]);

    const formatTime = (ts) => {
        if (!ts) return 'Recent';
        if (typeof ts === 'string') return new Date(ts).toLocaleString();
        if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
        return new Date(ts).toLocaleString();
    };

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                        Cloud Audit Ledger
                    </span>
                    <h2 className="text-2xl font-heading font-bold text-slate-900 mt-2 flex items-center gap-2">
                        <History className="text-blue-600" size={24} />
                        <span>Recent Scan History (Firestore)</span>
                    </h2>
                </div>

                <button
                    onClick={loadHistory}
                    disabled={loading}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    <span>Refresh</span>
                </button>
            </div>

            {loading && histories.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-mono">Loading history from Firestore...</p>
                </div>
            ) : histories.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-mono">
                    No scan history found in Firestore yet. Run a repository scan to log records!
                </div>
            ) : (
                <div className="space-y-3">
                    {histories.map((h, i) => (
                        <div 
                            key={i}
                            onClick={() => onSelectHistory && onSelectHistory(h)}
                            className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all cursor-pointer"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900 text-sm">
                                        {h.repo_name || h.target_repo || h.run_state?.repo_url || 'Repository Scan'}
                                    </span>
                                    <span className="text-xs font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                                        SUCCESS
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-mono">
                                    Scanned at: {formatTime(h.timestamp)}
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs font-mono text-slate-700 font-semibold">
                                        CVEs: {h.summary?.cves_found || 0} • Patched: {h.summary?.patches_generated || 0}
                                    </p>
                                    <p className="text-xs font-mono text-slate-500">
                                        PR: {h.summary?.pr_created ? 'Drafted' : 'Ready'}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}