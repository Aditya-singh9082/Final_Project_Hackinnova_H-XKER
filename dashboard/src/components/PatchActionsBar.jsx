import React, { useState, useEffect } from 'react';
import { GitCommit, Send, Loader2, ShieldCheck, Zap, ChevronRight, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { API_BASE } from '../apiConfig.js';

/**
 * PatchActionsBar — A prominent action bar shown on the Overview tab
 * after the pipeline completes with patches. Surfaces commit/PR buttons
 * so users don't have to navigate to the PR tab to find them.
 */
export default function PatchActionsBar({ runState, draftPrTitle, draftPrBody, user, onGoToPR }) {
  const [commitMode, setCommitMode] = useState('manual_review');
  const [committing, setCommitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [publishResult, setPublishResult] = useState(null);

  // Fetch the user's commit mode preference
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

  const handleCommitLocal = async () => {
    setCommitting(true);
    setCommitResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/patch/commit-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: draftPrTitle,
          targetDir: runState?.scanner?.target_dir || runState?.local_path,
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
      const res = await fetch(`${API_BASE}/api/github/publish-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftPrTitle,
          body: draftPrBody,
          branch: runState?.scanner?.target_branch || 'main',
          mode: commitMode,
          repoUrl: runState?.repo_url
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

  const isManual = commitMode === 'manual_review';

  return (
    <div className="space-y-3">
      {/* Main Action Bar */}
      <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${
        isManual 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' 
          : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status & Mode Indicator */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isManual 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}>
              {isManual ? <ShieldCheck size={22} /> : <Zap size={22} />}
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                Pipeline Complete — Patches Ready
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isManual 
                    ? 'bg-blue-100 text-blue-800 border-blue-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {isManual ? 'MANUAL REVIEW' : 'AUTO-COMMIT'}
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {isManual 
                  ? 'Review the patches below, then commit or publish a PR when ready.' 
                  : 'Auto-commit is enabled. Patches will be committed automatically.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isManual && (
              <>
                <button
                  onClick={handleCommitLocal}
                  disabled={committing}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-heading font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {committing ? <Loader2 size={14} className="animate-spin" /> : <GitCommit size={14} />}
                  <span>{committing ? 'Committing...' : 'Commit Patch Locally'}</span>
                </button>

                <button
                  onClick={handlePublishPR}
                  disabled={publishing}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-heading font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{publishing ? 'Publishing...' : 'Publish PR to GitHub'}</span>
                </button>
              </>
            )}

            <button
              onClick={onGoToPR}
              className="text-slate-600 hover:text-slate-900 font-heading font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-white/60 transition-all cursor-pointer"
            >
              <span>View Full PR Draft</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Result Banners */}
      {commitResult && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-sm ${
          commitResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {commitResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium">
            {commitResult.success ? commitResult.message : `Commit Error: ${commitResult.error}`}
          </span>
        </div>
      )}

      {publishResult && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
          publishResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {publishResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="font-medium">
              {publishResult.success 
                ? `Pull Request #${publishResult.prNumber} published successfully!` 
                : `Error: ${publishResult.error}`}
            </span>
          </div>
          {publishResult.success && publishResult.url !== '#' && (
            <a href={publishResult.url} target="_blank" rel="noreferrer" className="underline font-semibold flex items-center gap-1">
              <span>View on GitHub</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
