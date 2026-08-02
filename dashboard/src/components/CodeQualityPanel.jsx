import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Code, Copy, Check, Sparkles, FileText, ChevronRight, Award, Cpu, Zap } from 'lucide-react';
import { getUserGroqKey } from '../firebase.js';
import { API_BASE } from '../apiConfig.js';

export default function CodeQualityPanel({ user, initialReport }) {
    const [report, setReport] = useState(initialReport || null);
    const [loading, setLoading] = useState(!initialReport);
    const [selectedType, setSelectedType] = useState('all');
    const [suggestions, setSuggestions] = useState({});
    const [loadingSuggestion, setLoadingSuggestion] = useState({});
    const [copiedIndex, setCopiedIndex] = useState(null);

    useEffect(() => {
        setReport(initialReport || null);
        setLoading(false);
    }, [initialReport]);

    const handleSuggestRewrite = async (issue, index) => {
        setLoadingSuggestion(prev => ({ ...prev, [index]: true }));
        try {
            let apiKey = '';
            if (user?.uid) {
                const key = await getUserGroqKey(user.uid);
                if (key) apiKey = key;
            }
            const provider = apiKey ? 'groq' : 'puter';

            const res = await fetch(`${API_BASE}/api/quality/suggest-rewrite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snippet: issue.snippet,
                    issue_type: issue.issue_type,
                    description: issue.description,
                    file: issue.file,
                    apiKey,
                    provider
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuggestions(prev => ({
                    ...prev,
                    [index]: {
                        code: data.suggestion,
                        provider: data.provider,
                        label: data.label
                    }
                }));
            }
        } catch (e) {
            console.error("Suggestion failed:", e);
        } finally {
            setLoadingSuggestion(prev => ({ ...prev, [index]: false }));
        }
    };

    const copyToClipboard = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 shadow-sm text-center">
                <RefreshCw size={36} className="text-orange-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-heading font-bold text-slate-900">Running Rule-Based Code Quality Scan...</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">Analyzing ESLint complexity, dead code, and jscpd duplicates</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 shadow-sm text-center">
                <ShieldAlert size={40} className="text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-heading font-bold text-slate-800">No Code Quality Report Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Run a repository scan to trigger the GitHub Actions security and code quality pipeline (ESLint, JSCPD duplication, and AST complexity metrics).
                </p>
            </div>
        );
    }

    const issues = report?.issues || [];
    const score = report?.score ?? 100;

    const filteredIssues = selectedType === 'all' 
        ? issues 
        : issues.filter(i => i.issue_type === selectedType);

    const unusedCount = issues.filter(i => i.issue_type === 'unused_code').length;
    const dupCount = issues.filter(i => i.issue_type === 'duplicate_code').length;
    const complexityCount = issues.filter(i => i.issue_type === 'high_complexity').length;

    const getScoreColor = (s) => {
        if (s >= 80) return 'text-emerald-600 border-emerald-300 bg-emerald-50';
        if (s >= 60) return 'text-amber-600 border-amber-300 bg-amber-50';
        return 'text-red-600 border-red-300 bg-red-50';
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'unused_code':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'duplicate_code':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'high_complexity':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const formatTypeLabel = (type) => {
        switch (type) {
            case 'unused_code': return 'Unused Code';
            case 'duplicate_code': return 'Duplicate Code';
            case 'high_complexity': return 'High Complexity';
            default: return type;
        }
    };

    return (
        <div className="space-y-8">
            {/* Top Score & Stats Banner */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                                Independent Pipeline Stage
                            </span>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                Rule-Based • Deterministic
                            </span>
                        </div>
                        <h2 className="text-2xl font-heading font-bold text-slate-900 mt-2">Code Quality Scan</h2>
                        <p className="text-sm text-slate-600">
                            Detects verbose, redundant, and overly complex code. Suggestions are never auto-applied.
                        </p>
                    </div>
                </div>

                {/* Score & Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    {/* Overall Score Badge */}
                    <div className={`p-5 rounded-2xl border flex items-center justify-between ${getScoreColor(score)}`}>
                        <div>
                            <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-80">Quality Score</span>
                            <div className="text-4xl font-heading font-extrabold mt-1">
                                {score}
                                <span className="text-lg font-normal opacity-70">/100</span>
                            </div>
                        </div>
                        <Award size={36} className="opacity-80" />
                    </div>

                    {/* Unused Code Filter Card */}
                    <button
                        onClick={() => setSelectedType(selectedType === 'unused_code' ? 'all' : 'unused_code')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedType === 'unused_code'
                                ? 'border-purple-500 bg-purple-50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                        }`}
                    >
                        <span className="text-xs font-mono font-bold uppercase text-purple-700">Unused Code</span>
                        <div className="text-2xl font-heading font-bold text-slate-900 mt-1">{unusedCount}</div>
                        <span className="text-xs text-slate-500 font-mono">ESLint dead code rules</span>
                    </button>

                    {/* Duplicate Code Filter Card */}
                    <button
                        onClick={() => setSelectedType(selectedType === 'duplicate_code' ? 'all' : 'duplicate_code')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedType === 'duplicate_code'
                                ? 'border-orange-500 bg-orange-50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                        }`}
                    >
                        <span className="text-xs font-mono font-bold uppercase text-orange-700">Duplicate Code</span>
                        <div className="text-2xl font-heading font-bold text-slate-900 mt-1">{dupCount}</div>
                        <span className="text-xs text-slate-500 font-mono">JSCPD exact clone blocks</span>
                    </button>

                    {/* Complexity Filter Card */}
                    <button
                        onClick={() => setSelectedType(selectedType === 'high_complexity' ? 'all' : 'high_complexity')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedType === 'high_complexity'
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                        }`}
                    >
                        <span className="text-xs font-mono font-bold uppercase text-blue-700">High Complexity</span>
                        <div className="text-2xl font-heading font-bold text-slate-900 mt-1">{complexityCount}</div>
                        <span className="text-xs text-slate-500 font-mono">Cyclomatic & lines check</span>
                    </button>
                </div>
            </div>

            {/* Filter Pill Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedType('all')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedType === 'all'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        All Issues ({issues.length})
                    </button>
                    <button
                        onClick={() => setSelectedType('unused_code')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedType === 'unused_code'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-purple-700 hover:bg-purple-50'
                        }`}
                    >
                        Unused ({unusedCount})
                    </button>
                    <button
                        onClick={() => setSelectedType('duplicate_code')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedType === 'duplicate_code'
                                ? 'bg-orange-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-orange-700 hover:bg-orange-50'
                        }`}
                    >
                        Duplicates ({dupCount})
                    </button>
                    <button
                        onClick={() => setSelectedType('high_complexity')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedType === 'high_complexity'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
                        }`}
                    >
                        Complexity ({complexityCount})
                    </button>
                </div>

                <span className="text-xs font-mono text-slate-500">
                    Showing {filteredIssues.length} of {issues.length} issues
                </span>
            </div>

            {/* Empty/Clean Repo State */}
            {issues.length === 0 ? (
                <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-xl font-heading font-bold text-emerald-900">
                        No code quality issues found — 100% clean
                    </h3>
                    <p className="text-sm text-emerald-700 max-w-md mx-auto">
                        Your codebase passes all ESLint dead-code/complexity rules and has zero duplicate blocks detected by jscpd!
                    </p>
                </div>
            ) : (
                /* Issues List */
                <div className="space-y-4">
                    {filteredIssues.map((issue, idx) => {
                        const sugg = suggestions[idx];
                        const isSuggesting = loadingSuggestion[idx];

                        return (
                            <div
                                key={idx}
                                className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
                            >
                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${getBadgeStyle(issue.issue_type)}`}>
                                            {formatTypeLabel(issue.issue_type)}
                                        </span>
                                        <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-900">
                                            <FileText size={15} className="text-slate-400" />
                                            <span>{issue.file}</span>
                                            <span className="text-slate-400 font-light">:</span>
                                            <span className="text-orange-600">L{issue.line_range[0]}-{issue.line_range[1]}</span>
                                        </div>
                                    </div>

                                    {/* Action Button: Suggest AI Rewrite */}
                                    <button
                                        onClick={() => handleSuggestRewrite(issue, idx)}
                                        disabled={isSuggesting}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-300/80 transition-all cursor-pointer"
                                    >
                                        <Sparkles size={14} className="text-amber-500" />
                                        <span>{isSuggesting ? "Generating Rewrite..." : "Suggest AI Rewrite"}</span>
                                    </button>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-700 font-sans">
                                    {issue.description}
                                </p>

                                {/* Offending Code Snippet */}
                                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto border border-slate-800">
                                    <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pb-2 mb-2 border-b border-slate-800">
                                        <span>OFFENDING CODE — Lines {issue.line_range[0]} to {issue.line_range[1]}</span>
                                        <span>Read-only</span>
                                    </div>
                                    <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                                        <code>{issue.snippet}</code>
                                    </pre>
                                </div>

                                {/* AI Rewrite Suggestion (Optional, Never Auto-Applied) */}
                                {sugg && (
                                    <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 space-y-3 mt-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-200/60 pb-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={16} className="text-amber-600" />
                                                <span className="text-xs font-heading font-bold text-amber-900 uppercase tracking-wider">
                                                    AI Rewrite Suggestion ({sugg.provider})
                                                </span>
                                            </div>

                                            {/* Safety Label Badge */}
                                            <span className="text-[11px] font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 font-medium">
                                                {sugg.label}
                                            </span>
                                        </div>

                                        <div className="bg-slate-900 rounded-lg p-3.5 border border-slate-800 overflow-x-auto">
                                            <div className="flex justify-between items-center text-[11px] font-mono text-emerald-400 pb-1.5 mb-1.5 border-b border-slate-800">
                                                <span>SUGGESTED REWRITE (UNVERIFIED — NOT AUTO-APPLIED)</span>
                                                <button
                                                    onClick={() => copyToClipboard(sugg.code, `sugg-${idx}`)}
                                                    className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                                >
                                                    {copiedIndex === `sugg-${idx}` ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-400" />
                                                            <span className="text-emerald-400">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} />
                                                            <span>Copy Code</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                                                <code>{sugg.code}</code>
                                            </pre>
                                        </div>

                                        <div className="flex justify-end gap-2 text-xs font-mono text-slate-500">
                                            <span>No modifications were written to your repository.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
