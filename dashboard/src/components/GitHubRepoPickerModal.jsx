import React, { useState, useEffect } from 'react';
import { X, Search, GitBranch, Lock, Unlock, Star, FolderGit2, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

export default function GitHubRepoPickerModal({ user, onClose, onSelectRepo, onSignIn }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // all | owner | collaborator | private
  const [hasToken, setHasToken] = useState(false);

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
          throw new Error('No GitHub username found. Please sign in again.');
        }
        endpoint = `https://api.github.com/users/${username}/repos?sort=updated&per_page=50`;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        if (res.status === 401 && token) {
          localStorage.removeItem('github_token');
          setHasToken(false);
          throw new Error('GitHub token expired. Click below to reconnect for private repos.');
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
    fetchRepos();
  }, [user]);

  const handleReconnect = () => {
    if (onSignIn) {
      onSignIn();
      onClose();
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-card w-full max-w-3xl max-h-[85vh] flex flex-col border border-white/10 rounded-2xl shadow-2xl overflow-hidden bg-[#0e121b]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <FolderGit2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Select a GitHub Repository</h2>
              <p className="text-xs text-gray-400 font-mono">
                {username ? `@${username}'s repositories` : 'Pick a repository to scan'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Tabs Header */}
        <div className="p-4 border-b border-white/10 space-y-3 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories by name or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
              />
            </div>
            <button 
              onClick={fetchRepos}
              title="Refresh list"
              className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
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
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                  filterTab === t.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}

            {!hasToken && (
              <button
                onClick={handleReconnect}
                className="ml-auto text-xs font-mono text-violet-300 hover:text-violet-200 bg-violet-500/20 border border-violet-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
              >
                <span>🔐 Connect for Private & Org Repos</span>
              </button>
            )}
          </div>
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 font-mono text-sm">
              <Loader2 size={28} className="animate-spin text-cyan-400" />
              <span>Loading GitHub repositories...</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center space-y-3">
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={fetchRepos}
                className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-200 border border-red-500/40 text-xs hover:bg-red-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-16 text-gray-500 font-mono text-sm">
              No repositories match your search or filter.
            </div>
          ) : (
            filteredRepos.map(repo => {
              const isOwner = repo.owner?.login?.toLowerCase() === username?.toLowerCase();
              return (
                <div
                  key={repo.id}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white truncate">
                        {repo.full_name}
                      </span>
                      {repo.private ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Lock size={10} /> Private
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Unlock size={10} /> Public
                        </span>
                      )}
                      {!isOwner && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          Collaborator
                        </span>
                      )}
                    </div>

                    {repo.description && (
                      <p className="text-xs text-gray-400 truncate">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono pt-1">
                      {repo.language && (
                        <span className="text-gray-300">
                          • {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" /> {repo.stargazers_count}
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
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => {
                        onSelectRepo(repo.html_url);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold text-xs hover:bg-cyan-500/30 active:scale-95 transition-all shadow-md flex items-center gap-1.5 group-hover:border-cyan-400"
                    >
                      <span>Scan Repo</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>Total: {filteredRepos.length} repository(s)</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
