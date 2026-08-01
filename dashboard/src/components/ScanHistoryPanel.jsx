import React, { useState, useEffect, useCallback } from 'react';
import { History, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

const OUTCOME_STYLE = {
    success: {
        Icon: CheckCircle2,
        color: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/30',
        label: 'Auto-Patched',
    },
    flagged_for_review: {
        Icon: AlertTriangle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: 'Flagged',
    },
    manual_review_required: {
        Icon: AlertTriangle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: 'Manual Review',
    },
    triaged_excluded: {
        Icon: XCircle,
        color: 'text-gray-400',
        bg: 'bg-gray-500/10 border-gray-500/30',
        label: 'Excluded',
    },
    unknown: {
        Icon: XCircle,
        color: 'text-gray-500',
        bg: 'bg-gray-700/20 border-gray-700/30',
        label: 'Unknown',
    },
};

export default function ScanHistoryPanel({ user }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadHistory = useCallback(() => {
        setLoading(true);
        setError(null);
        const uid = user?.uid || 'local';
        fetch(`${API_BASE}/api/scan-history/${uid}`)
            .then(r => r.json())
            .then(d => {
                setHistory(Array.isArray(d) ? d : []);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [user]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-3">
            <RefreshCw size={20} className="text-cyan-400 animate-spin" />
            <span className="text-gray-500 text-sm font-mono">Loading scan history...</span>
        </div>
    );

    if (error) return (
        <div className="flex items-start gap-2 text-red-400 font-mono text-sm p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <XCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Failed to load history: {error}</span>
        </div>
    );

    if (history.length === 0) return (
        <div className="text-center py-16">
            <History size={40} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm">No scan history yet.</p>
            <p className="text-gray-600 text-xs mt-1">Completed scans will appear here.</p>
        </div>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs font-mono">
                    {history.length} scan{history.length !== 1 ? 's' : ''} recorded
                </p>
                <button
                    id="btn-refresh-history"
                    onClick={loadHistory}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors font-mono"
                >
                    <RefreshCw size={11} /> Refresh
                </button>
            </div>

            {[...history].map((entry, idx) => {
                const outcome = entry.final_outcome || (entry.outcome_summary ? 'success' : 'unknown');
                const style = OUTCOME_STYLE[outcome] || OUTCOME_STYLE.unknown;
                const { Icon } = style;
                const date = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : null;
                const summary = entry.outcome_summary;

                return (
                    <div key={entry.id || idx} className={`border rounded-xl p-4 ${style.bg}`}>
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <Icon size={14} className={`flex-shrink-0 ${style.color}`} />
                                <span className="font-mono text-sm text-white font-semibold truncate">
                                    {entry.repo || entry.repo_name || 'unknown'}
                                </span>
                            </div>
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded flex-shrink-0 ${style.color}`}>
                                {style.label}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono pl-5">
                            {entry.package && (
                                <span className="text-gray-400">
                                    Package: <span className="text-gray-200">{entry.package}</span>
                                </span>
                            )}
                            {entry.method_used && (
                                <span className="text-gray-400">
                                    Method: <span className="text-gray-200">{entry.method_used}</span>
                                </span>
                            )}
                            {entry.cve_ids?.length > 0 && (
                                <span className="col-span-2 text-gray-400">
                                    CVEs: <span className="text-gray-200">{entry.cve_ids.join(', ')}</span>
                                </span>
                            )}
                            {entry.regression_result && (
                                <span className="text-gray-400">
                                    Regression: <span className={entry.regression_result === 'PASS' ? 'text-green-400' : 'text-red-400'}>
                                        {entry.regression_result}
                                    </span>
                                </span>
                            )}
                            {summary && (
                                <>
                                    {summary.cves_found !== undefined && (
                                        <span className="text-gray-400">CVEs found: <span className="text-gray-200">{summary.cves_found}</span></span>
                                    )}
                                    {summary.patches_generated !== undefined && (
                                        <span className="text-gray-400">Patches: <span className="text-gray-200">{summary.patches_generated}</span></span>
                                    )}
                                    {summary.mode_used && (
                                        <span className="col-span-2 text-gray-400">
                                            Mode: <span className="text-cyan-300">{summary.mode_used}</span>
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {date && (
                            <div className="flex items-center gap-1 text-gray-600 text-xs font-mono pl-5 mt-2">
                                <Clock size={10} />
                                {date}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}