import React from 'react';
import { 
  Shield, 
  Layers, 
  Zap, 
  CheckCircle, 
  ArrowRight, 
  Terminal, 
  GitPullRequest, 
  Clock, 
  Lock, 
  LogOut, 
  User
} from 'lucide-react';

export default function LandingPage({ 
  user, 
  handleSignIn, 
  handleSignOut, 
  onLaunchDashboard, 
  efficacyMetrics 
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative overflow-x-hidden selection:bg-orange-100 selection:text-orange-900">
      {/* High-performance GPU shader ambient background (zero repaint on scroll) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 10% 15%, rgba(249, 115, 22, 0.08) 0%, transparent 45%), radial-gradient(circle at 90% 40%, rgba(37, 99, 235, 0.08) 0%, transparent 45%)'
        }}
      />

      {/* NAVBAR */}
      <nav className="max-w-[1440px] mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-md shadow-orange-500/10 flex items-center justify-center">
            <img src="/favicon.svg" alt="Kalki Favicon Logo" className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-slate-900">
              Kalki
            </h1>
            <p className="text-[11px] text-orange-600 font-mono uppercase tracking-widest font-semibold">
              Security Patch Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onLaunchDashboard}
                className="bg-blue-600 hover:bg-blue-500 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={16} />
              </button>

              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "GitHub User"} 
                    className="w-7 h-7 rounded-full border border-slate-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    <User size={14} />
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-800">
                  {user.reloadUserInfo?.screenName || user.displayName || "User"}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="ml-2 text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="bg-slate-900 hover:bg-slate-800 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-lg shadow-slate-900/15 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Sign in with GitHub</span>
            </button>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-[1100px] mx-auto px-6 pt-16 pb-20 text-center relative z-10 space-y-8">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/80 px-4 py-1.5 rounded-full text-xs font-mono font-semibold text-orange-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>Automated Supply Chain Security • Zero Alert Fatigue</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-heading font-bold text-slate-900 tracking-tight leading-tight">
          Deterministic Security Patch Engine for Modern Software
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Kalki eliminates 95 percent of false positive vulnerability alerts by proving AST reachability, automatically generating safe semver updates, verifying fixes with live Proof of Concept exploits, and drafting GitHub Pull Requests within seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={user ? onLaunchDashboard : handleSignIn}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-heading font-bold text-base px-8 py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-orange-600/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span>{user ? "Launch Kalki Dashboard" : "Sign in with GitHub to Start"}</span>
            <ArrowRight size={18} />
          </button>

          <a
            href="#features"
            className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-heading font-semibold text-base px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Explore Architecture</span>
          </a>
        </div>

        {/* Efficacy Snapshot Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10">
          <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-500">Auto-Patch Rate</p>
            <p className="text-3xl font-heading font-bold text-emerald-600 mt-1">
              {efficacyMetrics?.clean_auto_patch_rate ?? 0}%
            </p>
          </div>
          <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-500">Safely-Handled Rate</p>
            <p className="text-3xl font-heading font-bold text-blue-600 mt-1">
              {efficacyMetrics?.safely_handled_rate ?? 0}%
            </p>
          </div>
          <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-500">False Positive Noise</p>
            <p className="text-3xl font-heading font-bold text-slate-900 mt-1">
              0%
            </p>
          </div>
          <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-500">Verification Speed</p>
            <p className="text-3xl font-heading font-bold text-orange-600 mt-1">
              &lt; 5 ms
            </p>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="max-w-[1280px] mx-auto px-6 py-16 space-y-12 relative z-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            Autonomous Defense-in-Depth
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900">
            How Kalki Transforms Vulnerability Remediation
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm">
            Traditional tools bury engineering teams in hundreds of unreachable CVE alerts. Kalki replaces noise with mathematically verified fixes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900">
              AST Reachability Analysis
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Maps vulnerable dependency symbols directly against your application's Abstract Syntax Tree. Automatically categorizes alerts as Runtime Reachable or Unreachable Code to eliminate noise.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900">
              Live PoC Exploit Verification
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Attacks both the vulnerable and patched copies of your codebase with real Proof of Concept payloads (such as ReDoS or Prototype Pollution) to mathematically prove the vulnerability is mitigated.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900">
              Automated PR Composition
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Runs your existing regression test suite to guarantee zero breaking changes, then drafts a comprehensive Markdown Pull Request ready for 1-click publishing to GitHub.
            </p>
          </div>
        </div>
      </section>

      {/* PIPELINE SEQUENCE SECTION */}
      <section className="max-w-[1100px] mx-auto px-6 py-16 relative z-10 space-y-10">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 md:p-12 shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600">
              Deterministic Sequence
            </span>
            <h3 className="text-2xl md:text-3xl font-heading font-bold text-slate-900">
              End-to-End Pipeline Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md inline-block">
                01 • SCAN
              </span>
              <h4 className="font-heading font-bold text-slate-900 text-base">BFS Graph Traversal</h4>
              <p className="text-xs text-slate-600">Parses package-lock.json up to 3 depth levels against OSV advisory databases.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-md inline-block">
                02 • FILTER
              </span>
              <h4 className="font-heading font-bold text-slate-900 text-base">AST Context Mapping</h4>
              <p className="text-xs text-slate-600">Determines if vulnerable function signatures are invoked by application code.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md inline-block">
                03 • VERIFY
              </span>
              <h4 className="font-heading font-bold text-slate-900 text-base">PoC & Regression Tests</h4>
              <p className="text-xs text-slate-600">Applies patch, runs malicious PoC payloads, and executes automated test suites.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md inline-block">
                04 • DELIVER
              </span>
              <h4 className="font-heading font-bold text-slate-900 text-base">GitHub PR Draft</h4>
              <p className="text-xs text-slate-600">Generates verifiable Markdown pull request with timing logs and AST proof.</p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={user ? onLaunchDashboard : handleSignIn}
              className="bg-slate-900 hover:bg-slate-800 text-white font-heading font-semibold text-sm px-6 py-3.5 rounded-xl inline-flex items-center gap-2 shadow-md shadow-slate-900/15 cursor-pointer"
            >
              <span>{user ? "Enter Kalki Dashboard" : "Sign In with GitHub to Explore"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-[1440px] mx-auto px-6 py-10 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Kalki Logo" className="w-5 h-5" />
          <span className="font-bold text-slate-700">Kalki</span>
          <span>• Automated Security Patch Engine</span>
        </div>
        <div className="flex items-center gap-6">
          <span>GitHub Single Sign-On</span>
          <span>AES-256-GCM Encrypted</span>
          <span>Firestore Cloud Native</span>
        </div>
      </footer>
    </div>
  );
}
