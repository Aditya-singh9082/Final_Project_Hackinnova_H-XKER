import React, { useState, useEffect } from 'react';
import { FolderGit2, X, Search, Globe, Lock, Unlock, Star, ArrowRight, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

export default function GitHubRepoPickerModal({ isOpen, onClose, user, onRepoSelected, onScanQuality, onSignIn }) {
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // all | owner | collaborator | private
    const [hasToken, setHasToken] = useState(false);

    // Custom URL input state
    const [customUrl, setCustomUrl] = useState('');
    const [customError, setCustomError] = useState(null);

    const fetchRepos = async () => {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('github_token');
        setHasToken(!!token);

        try {
            let headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            let endpoint = '';

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                endpoint = 'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member';
            } else {
                const username = user?.reloadUserInfo?.screenName || user?.displayName;
                if (!username) {
                    setLoading(false);
                    return;
                }
                endpoint = `https://api.github.com/users/${username}/repos?sort=updated&per_page=50`;
            }

            const res = await fetch(endpoint, { headers });
            if (!res.ok) {
                if (res.status === 401 && token) {
                    localStorage.removeItem('github_token');
                    setHasToken(false);
                    throw new Error('GitHub token expired. Reconnect for private repos.');
                }
                throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
            }

            const data = await res.json();
            setRepos(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRepos();
            setCustomUrl('');
            setCustomError(null);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        setCustomError(null);
        const url = customUrl.trim();
        if (!url) {
            setCustomError('Please enter a valid GitHub repository URL.');
            return;
        }
        onRepoSelected(url);
        onClose();
    };

    const username = user?.reloadUserInfo?.screenName;

    const filteredRepos = repos.filter(r => {
        const matchesQuery = !searchQuery ||
            r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;

        if (filterTab === 'owner') {
            return r.owner?.login?.toLowerCase() === username?.toLowerCase();
        }
        if (filterTab === 'collaborator') {
            return r.owner?.login?.toLowerCase() !== username?.toLowerCase();
        }
        if (filterTab === 'private') {
            return r.private === true;
        }
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                            <FolderGit2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-heading font-bold text-slate-900">Scan GitHub Repository</h3>
                            <p className="text-xs text-slate-500 font-mono">
                                {username ? `@${username}'s repositories • My Repos` : 'Pick a repository to scan'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Custom URL Quick-Scan Bar */}
                <form onSubmit={handleCustomSubmit} className="p-4 border-b border-slate-200 bg-white">
                    <label className="block text-xs font-mono font-semibold uppercase text-slate-700 mb-1.5">
                        Scan any repository URL
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="https://github.com/username/repository"
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-heading font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                        >
                            <span>Scan Vulnerabilities</span>
                            <ArrowRight size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!customUrl.trim()) {
                                    setCustomError("Please enter a repository URL");
                                    return;
                                }
                                if (onScanQuality) onScanQuality(customUrl.trim());
                                onClose();
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-heading font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                        >
                            <span>Scan Code Quality</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                    {customError && (
                        <p className="text-xs text-red-600 font-mono mt-1">{customError}</p>
                    )}
                </form>

                {/* Search & Tabs Header for My Repos */}
                <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700">
                            My Repositories ({repos.length})
                        </span>
                        <button
                            onClick={fetchRepos}
                            title="Refresh list"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search repositories by name or description..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {[
                            { id: 'all', label: 'All Repos' },
                            { id: 'owner', label: 'Personal' },
                            { id: 'collaborator', label: 'Collaborator/Org' },
                            { id: 'private', label: 'Private Only' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setFilterTab(t.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                                    filterTab === t.id
                                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}

                        {!hasToken && (
                            <button
                                onClick={() => {
                                    if (onSignIn) {
                                        onSignIn();
                                        onClose();
                                    }
                                }}
                                className="ml-auto text-xs font-mono text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                            >
                                <span>🔐 Connect for Private Repos</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Repository List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400 font-mono text-sm">
                            <Loader2 size={26} className="animate-spin text-blue-600" />
                            <span>Loading GitHub repositories...</span>
                        </div>
                    ) : error ? (
                        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-center space-y-3">
                            <p className="text-red-700 text-sm">{error}</p>
                            <button
                                onClick={fetchRepos}
                                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-500 transition-colors cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredRepos.length === 0 ? (
                        <div className="text-center py-14 text-slate-500 font-mono text-sm">
                            No repositories match your search or filter.
                        </div>
                    ) : (
                        filteredRepos.map(repo => {
                            const isOwner = repo.owner?.login?.toLowerCase() === username?.toLowerCase();
                            return (
                                <div
                                    key={repo.id}
                                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 transition-all flex items-center justify-between gap-4 group"
                                >
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-slate-900 truncate">
                                                {repo.full_name}
                                            </span>
                                            {repo.private ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-200">
                                                    <Lock size={10} /> Private
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <Unlock size={10} /> Public
                                                </span>
                                            )}
                                            {!isOwner && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-100 text-violet-800 border border-violet-200">
                                                    Collaborator
                                                </span>
                                            )}
                                        </div>

                                        {repo.description && (
                                            <p className="text-xs text-slate-500 truncate">
                                                {repo.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono pt-1">
                                            {repo.language && (
                                                <span className="text-slate-600 font-semibold">
                                                    • {repo.language}
                                                </span>
                                            )}
                                            {repo.stargazers_count > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Star size={12} className="text-amber-500 fill-amber-500" /> {repo.stargazers_count}
                                                </span>
                                            )}
                                            <span>
                                                Updated {new Date(repo.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <a
                                            href={repo.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Open on GitHub"
                                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                        <button
                                            onClick={() => {
                                                onRepoSelected(repo.html_url);
                                                onClose();
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <span>Scan Vulnerabilities</span>
                                            <span>→</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (onScanQuality) onScanQuality(repo.html_url);
                                                onClose();
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <span>Scan Code Quality</span>
                                            <span>→</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>Showing {filteredRepos.length} repository(s)</span>
                    <button
                        onClick={onClose}
                        className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
