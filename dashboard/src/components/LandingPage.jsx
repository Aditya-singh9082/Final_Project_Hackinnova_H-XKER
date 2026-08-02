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
  User,
  Play,
  Fingerprint,
  Wifi,
  Key,
  Settings,
  Globe,
  Search,
  Activity,
  Code2,
  Check
} from 'lucide-react';

export default function LandingPage({ 
  user, 
  handleSignIn, 
  handleSignOut, 
  onLaunchDashboard, 
  efficacyMetrics 
}) {
  return (
    <div className="min-h-screen bg-[#151923] dark:bg-[#151923] text-slate-100 font-sans relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* High-performance ambient cyber background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.12) 0%, transparent 50%)'
        }}
      />

      {/* NAVBAR */}
      <header className="max-w-[1440px] mx-auto px-8 py-6 flex items-center justify-between relative z-20 border-b border-slate-800/60">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={user ? onLaunchDashboard : handleSignIn}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-500 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#151923] rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-pink-500 fill-pink-500/20" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-heading font-extrabold tracking-tight text-white">
              Kalki
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#home" className="text-white font-semibold transition-colors hover:text-white">Home</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-white transition-colors">Pipeline</a>
          <a href="#quality" className="hover:text-white transition-colors">Code Quality</a>
          <a href="#metrics" className="hover:text-white transition-colors">Metrics</a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={user ? onLaunchDashboard : handleSignIn}
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer hidden sm:flex items-center justify-center"
            title="Search Dashboard"
          >
            <Search size={18} />
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onLaunchDashboard}
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight size={12} className="text-white" />
                </div>
                <span>Dashboard</span>
              </button>

              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "User"} 
                    className="w-7 h-7 rounded-full border border-slate-600"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    <User size={14} />
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-200 hidden lg:inline">
                  {user.reloadUserInfo?.screenName || user.displayName || "User"}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="text-slate-400 hover:text-red-400 transition-colors p-1 cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight size={12} className="text-white" />
              </div>
              <span>Sign in with GitHub</span>
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION — RECREATED FROM IMAGE LAYOUT */}
      <section id="home" className="max-w-[1440px] mx-auto px-8 pt-12 pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-mono font-semibold text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>Automated Supply Chain Security • Zero Alert Fatigue</span>
            </div>

            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-heading font-extrabold text-white tracking-tight leading-[1.1]">
              Essential Policy for Cyber security Protection.
            </h1>

            <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed font-sans">
              In today's increasingly digital world, cybersecurity has become paramount. With the rapid expansion of online activities, Kalki eliminates 95% of false positive alerts by proving AST reachability and auto-patching vulnerabilities.
            </p>

            {/* Action CTAs Matching Screenshot */}
            <div className="flex flex-wrap items-center gap-5 pt-2">
              <button
                onClick={user ? onLaunchDashboard : handleSignIn}
                className="bg-slate-900 border-2 border-purple-500/80 hover:border-purple-400 text-white font-heading font-semibold text-sm px-7 py-3.5 rounded-xl flex items-center gap-3 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/80" />
                <span>{user ? "Request A Demo / Launch" : "Request A Demo"}</span>
              </button>

              <button
                onClick={user ? onLaunchDashboard : handleSignIn}
                className="flex items-center gap-3 text-slate-200 hover:text-white font-heading font-semibold text-sm group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white text-purple-600 flex items-center justify-center shadow-lg shadow-white/10 group-hover:scale-105 transition-transform">
                  <Play size={18} className="fill-purple-600 ml-0.5" />
                </div>
                <span>Watch Intro Video</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Graphic Frame & Floating Badges */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6">
            {/* Background Circuit Trace Glow */}
            <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-pink-600/10 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Central Shield Graphic Container */}
            <div className="relative w-full max-w-[460px] aspect-[4/5] flex items-center justify-center">
              
              {/* Main White Shield Border Frame */}
              <div className="relative w-full h-full p-2 rounded-[40px] bg-white shadow-2xl shadow-purple-900/40 overflow-hidden flex items-center justify-center border-4 border-white/90">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop" 
                  alt="Cyber Security Analyst" 
                  className="w-full h-full object-cover rounded-[34px]"
                />
                
                {/* Tech Dark Overlay with Circuit Grid lines */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#151923] via-transparent to-transparent opacity-60" />
              </div>

              {/* Floating Badge 1: Top Left Pink/Red Lock */}
              <div className="absolute -top-4 -left-4 bg-gradient-to-tr from-red-500 to-pink-500 p-3 rounded-2xl shadow-xl shadow-red-500/30 text-white animate-bounce-slow">
                <Lock size={22} className="fill-white/20" />
              </div>

              {/* Floating Badge 2: Bottom Left Blue Glass Fingerprint Card */}
              <div className="absolute bottom-6 -left-8 bg-slate-900/90 backdrop-blur-md border border-blue-500/40 p-4 rounded-2xl shadow-2xl shadow-blue-500/20 flex items-center justify-center text-blue-400">
                <Fingerprint size={38} className="text-blue-400 animate-pulse" />
              </div>

              {/* Floating Badge 3: Right Side Blue Glass Signal Widget */}
              <div className="absolute top-1/3 -right-6 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-2xl shadow-blue-600/30 text-white">
                <Wifi size={32} />
              </div>

              {/* Floating Badge 4: Bottom Right Key & Tech Icons */}
              <div className="absolute -bottom-4 right-4 flex items-center gap-3">
                <div className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl shadow-lg text-slate-300">
                  <Key size={18} />
                </div>
                <div className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl shadow-lg text-slate-300">
                  <Settings size={18} />
                </div>
                <div className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl shadow-lg text-slate-300">
                  <Globe size={18} />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Efficacy Snapshot Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto pt-20">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-400">Auto-Patch Rate</p>
            <p className="text-4xl font-heading font-extrabold text-emerald-400 mt-2">
              {efficacyMetrics?.clean_auto_patch_rate ?? 0}%
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-400">Safely-Handled Rate</p>
            <p className="text-4xl font-heading font-extrabold text-blue-400 mt-2">
              {efficacyMetrics?.safely_handled_rate ?? 0}%
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-400">False Positive Noise</p>
            <p className="text-4xl font-heading font-extrabold text-white mt-2">
              0%
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-mono font-semibold uppercase text-slate-400">Verification Speed</p>
            <p className="text-4xl font-heading font-extrabold text-orange-400 mt-2">
              &lt; 5 ms
            </p>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="max-w-[1280px] mx-auto px-8 py-20 space-y-12 relative z-10 border-t border-slate-800/80">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 rounded-full">
            Autonomous Defense-in-Depth
          </span>
          <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-white">
            How Kalki Transforms Vulnerability Remediation
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Traditional tools bury engineering teams in hundreds of unreachable CVE alerts. Kalki replaces noise with mathematically verified fixes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl hover:border-purple-500/40 hover:-translate-y-1.5 transition-all duration-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-heading font-bold text-white">
              AST Reachability Analysis
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Maps vulnerable dependency symbols directly against your application's Abstract Syntax Tree. Automatically categorizes alerts as Runtime Reachable or Unreachable Code to eliminate noise.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl hover:border-blue-500/40 hover:-translate-y-1.5 transition-all duration-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-heading font-bold text-white">
              Live PoC Exploit Verification
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Attacks both the vulnerable and patched copies of your codebase with real Proof of Concept payloads (such as ReDoS or Prototype Pollution) to mathematically prove the vulnerability is mitigated.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl hover:border-emerald-500/40 hover:-translate-y-1.5 transition-all duration-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-xl font-heading font-bold text-white">
              Automated PR Composition
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Runs your existing regression test suite to guarantee zero breaking changes, then drafts a comprehensive Markdown Pull Request ready for 1-click publishing to GitHub.
            </p>
          </div>
        </div>
      </section>

      {/* PIPELINE SEQUENCE SECTION */}
      <section id="pipeline" className="max-w-[1280px] mx-auto px-8 py-20 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 md:p-14 shadow-2xl space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400">
              Deterministic Sequence
            </span>
            <h3 className="text-3xl md:text-4xl font-heading font-extrabold text-white">
              End-to-End Pipeline Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md inline-block">
                01 • SCAN
              </span>
              <h4 className="font-heading font-bold text-white text-base">BFS Graph Traversal</h4>
              <p className="text-xs text-slate-400">Parses package-lock.json up to 3 depth levels against OSV advisory databases.</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md inline-block">
                02 • FILTER
              </span>
              <h4 className="font-heading font-bold text-white text-base">AST Context Mapping</h4>
              <p className="text-xs text-slate-400">Determines if vulnerable function signatures are invoked by application code.</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md inline-block">
                03 • VERIFY
              </span>
              <h4 className="font-heading font-bold text-white text-base">PoC & Regression Tests</h4>
              <p className="text-xs text-slate-400">Applies patch, runs malicious PoC payloads, and executes automated test suites.</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 space-y-2">
              <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-md inline-block">
                04 • DELIVER
              </span>
              <h4 className="font-heading font-bold text-white text-base">GitHub PR Draft</h4>
              <p className="text-xs text-slate-400">Generates verifiable Markdown pull request with timing logs and AST proof.</p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={user ? onLaunchDashboard : handleSignIn}
              className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white font-heading font-bold text-sm px-8 py-4 rounded-xl inline-flex items-center gap-3 shadow-xl shadow-purple-500/25 cursor-pointer"
            >
              <span>{user ? "Enter Kalki Dashboard" : "Sign In with GitHub to Explore"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-[1440px] mx-auto px-8 py-10 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-pink-500" />
          <span className="font-bold text-white">Kalki</span>
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
