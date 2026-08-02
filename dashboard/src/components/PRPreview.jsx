import React, { useState } from 'react';
import { GitPullRequest, Copy, Check, ExternalLink, Send, ShieldAlert, Loader2 } from 'lucide-react';

export default function PRPreview({ activePr, runState }) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  const draftPr = activePr || {
    title: "chore(security): automated vulnerability remediation via Kalki",
    body: "No draft PR available in run_state.json yet."
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftPr.body || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          branch: runState?.scanner?.target_branch || 'main'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPublishResult({ success: true, url: data.prUrl || '#' });
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
            Pull Request Composer
          </span>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mt-2 flex items-center gap-2">
            <GitPullRequest className="text-blue-600" size={24} />
            <span>{draftPr.title}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Markdown' : 'Copy PR Body'}</span>
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

      {publishResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          publishResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{publishResult.success ? 'Pull Request published successfully to repository!' : `Error: ${publishResult.error}`}</span>
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
