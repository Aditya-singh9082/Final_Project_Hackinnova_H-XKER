import React, { useState, useEffect } from 'react';
import { GitPullRequest, Copy, Check, ExternalLink, Send, ShieldAlert, Loader2, GitCommit, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export default function PRPreview({ activePr, runState, user }) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [commitResult, setCommitResult] = useState(null);

  // Commit Mode: 'manual_review' (default) vs 'auto_commit'
  const [commitMode, setCommitMode] = useState('manual_review');
  const [modeSaving, setModeSaving] = useState(false);

  const draftPr = activePr || {
    title: "chore(security): automated vulnerability remediation via Kalki",
    body: "No draft PR available in run_state.json yet."
  };

  useEffect(() => {
    if (user?.uid) {
      fetch(`/api/auth/get-commit-mode/${encodeURIComponent(user.uid)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.commitMode) setCommitMode(data.commitMode);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleModeChange = async (mode) => {
    setCommitMode(mode);
    if (!user?.uid) return;
    setModeSaving(true);
    try {
      await fetch('/api/auth/save-commit-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, commitMode: mode })
      });
    } catch (e) {
      console.error('Failed to save commit mode:', e);
    } finally {
      setModeSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftPr.body || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommitLocal = async () => {
    setCommitting(true);
    setCommitResult(null);
    try {
      const res = await fetch('/api/patch/commit-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: draftPr.title,
          targetDir: runState?.scanner?.target_dir,
          mode: commitMode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCommitResult({ success: true, message: data.output || 'Patch committed to local git repository!' });
      } else {
        setCommitResult({ success: false, error: data.error || 'Failed to commit patch locally' });
      }
    } catch (e) {
      setCommitResult({ success: false, error: e.message });
    } finally {
      setCommitting(false);
    }
  };

  const handlePublishPR = async () => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/github/publish-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftPr.title,
          body: draftPr.body,
          branch: runState?.scanner?.target_branch || 'main',
          mode: commitMode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPublishResult({ success: true, url: data.prUrl || '#', prNumber: data.prNumber });
      } else {
        setPublishResult({ success: false, error: data.error || 'Failed to publish PR' });
      }
    } catch (e) {
      setPublishResult({ success: false, error: e.message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            Pull Request Composer & Commit Strategy
          </span>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mt-2 flex items-center gap-2">
            <GitPullRequest className="text-blue-600" size={24} />
            <span>{draftPr.title}</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopy}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Markdown' : 'Copy PR Body'}</span>
          </button>

          <button
            onClick={handleCommitLocal}
            disabled={committing}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-heading font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {committing ? <Loader2 size={16} className="animate-spin" /> : <GitCommit size={16} />}
            <span>{committing ? 'Committing...' : 'Commit Patch Locally'}</span>
          </button>

          <button
            onClick={handlePublishPR}
            disabled={publishing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>{publishing ? 'Publishing...' : 'Publish PR to GitHub'}</span>
          </button>
        </div>
      </div>

      {/* ========== COMMIT STRATEGY: AUTO-COMMIT vs REQUIRE MANUAL REVIEW ========== */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <h3 className="text-sm font-heading font-bold text-slate-900">
              Patch Commit Strategy & Approval Mode
            </h3>
          </div>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
            commitMode === 'auto_commit'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-blue-100 text-blue-800 border-blue-300'
          }`}>
            {commitMode === 'auto_commit' ? '⚡ AUTO-COMMIT ENABLED' : '🛡️ REVIEW REQUIRED (MANUAL)'}
          </span>
        </div>

        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          Choose whether generated patches are committed automatically when verification checks pass, or if explicit manual review is required before committing to your repository.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option 1: Require Review (Manual Commit) */}
          <button
            type="button"
            onClick={() => handleModeChange('manual_review')}
            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
              commitMode === 'manual_review'
                ? 'bg-white border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                commitMode === 'manual_review' ? 'border-blue-600' : 'border-slate-300'
              }`}>
                {commitMode === 'manual_review' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
              </div>
              <div>
                <span className={`text-xs font-heading font-bold block ${
                  commitMode === 'manual_review' ? 'text-blue-900' : 'text-slate-800'
                }`}>
                  Require Manual Review (Default)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                  Always inspect patch markdown and verification proofs before clicking commit or publish PR.
                </span>
              </div>
            </div>
          </button>

          {/* Option 2: Auto-Commit & Auto-PR */}
          <button
            type="button"
            onClick={() => handleModeChange('auto_commit')}
            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
              commitMode === 'auto_commit'
                ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                commitMode === 'auto_commit' ? 'border-emerald-600' : 'border-slate-300'
              }`}>
                {commitMode === 'auto_commit' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
              </div>
              <div>
                <span className={`text-xs font-heading font-bold block ${
                  commitMode === 'auto_commit' ? 'text-emerald-900' : 'text-slate-800'
                }`}>
                  Auto-Commit & Auto-PR
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                  Automatically stage, commit, and create PRs when all regression and exploit tests pass cleanly.
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Result feedback banners */}
      {commitResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          commitResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{commitResult.success ? commitResult.message : `Commit Error: ${commitResult.error}`}</span>
        </div>
      )}

      {publishResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          publishResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{publishResult.success ? `Pull Request #${publishResult.prNumber} published successfully to repository!` : `Error: ${publishResult.error}`}</span>
          {publishResult.success && publishResult.url !== '#' && (
            <a href={publishResult.url} target="_blank" rel="noreferrer" className="underline font-semibold flex items-center gap-1">
              <span>View on GitHub</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {/* Markdown Body Viewer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 overflow-x-auto">
        <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
          {draftPr.body}
        </pre>
      </div>
    </div>
  );
}
