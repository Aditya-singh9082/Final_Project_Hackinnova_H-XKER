import React, { useState } from 'react';
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
  Check,
  Sun,
  Moon,
  X,
  Video,
  Sparkles,
  Calendar
} from 'lucide-react';

export default function LandingPage({ 
  user, 
  handleSignIn, 
  handleSignOut, 
  onLaunchDashboard, 
  efficacyMetrics,
  theme,
  toggleTheme 
}) {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 relative overflow-x-hidden selection:bg-orange-500 selection:text-white ${
      isDark ? 'bg-[#151923] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* High-performance ambient cyber background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.12) 0%, transparent 50%)'
            : 'radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.06) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.06) 0%, transparent 50%)'
        }}
      />

      {/* NAVBAR */}
      <header className={`max-w-[1440px] mx-auto px-8 py-6 flex items-center justify-between relative z-20 border-b ${
        isDark ? 'border-slate-800/60 bg-[#151923]/90' : 'border-slate-200 bg-white/90'
      } backdrop-blur-md`}>
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={user ? onLaunchDashboard : handleSignIn}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-500 p-0.5 shadow-lg shadow-purple-500/20">
            <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${isDark ? 'bg-[#151923]' : 'bg-white'}`}>
              <Shield className="w-5 h-5 text-pink-500 fill-pink-500/20" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-heading font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kalki
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <a href="#home" className={`font-semibold transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Home</a>
          <a href="#features" className="hover:text-purple-600 dark:hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-purple-600 dark:hover:text-white transition-colors">Pipeline</a>
          <a href="#quality" className="hover:text-purple-600 dark:hover:text-white transition-colors">Code Quality</a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
          >
            {isDark ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-slate-700" />
            )}
            <span className="text-xs font-heading font-semibold hidden sm:inline">
              {isDark ? 'Light' : 'Dark'}
            </span>
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

              <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl ${
                isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "User"} 
                    className="w-7 h-7 rounded-full border border-slate-400"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    <User size={14} />
                  </div>
                )}
                <span className={`text-xs font-semibold hidden lg:inline ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {user.reloadUserInfo?.screenName || user.displayName || "User"}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
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

      {/* HERO SECTION — NO PERSON PHOTO, REPLACED WITH CYBER ENGINE GRAPHIC */}
      <section id="home" className="max-w-[1440px] mx-auto px-8 pt-12 pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className={`inline-flex items-center gap-2 border px-4 py-1.5 rounded-full text-xs font-mono font-semibold ${
              isDark 
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>Automated Supply Chain Security • Zero Alert Fatigue</span>
            </div>

            <h1 className={`text-5xl sm:text-6xl xl:text-7xl font-heading font-extrabold tracking-tight leading-[1.1] ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Essential Policy for Cyber security Protection.
            </h1>

            <p className={`text-base sm:text-lg max-w-xl leading-relaxed font-sans ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              In today's increasingly digital world, cybersecurity has become paramount. With the rapid expansion of online activities, Kalki eliminates 95% of false positive alerts by proving AST reachability and auto-patching vulnerabilities.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-5 pt-2">
              <button
                onClick={() => {
                  if (user) onLaunchDashboard();
                  else setIsDemoModalOpen(true);
                }}
                className="bg-slate-900 border-2 border-purple-500/80 hover:border-purple-400 text-white font-heading font-semibold text-sm px-7 py-3.5 rounded-xl flex items-center gap-3 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/80" />
                <span>{user ? "Launch Kalki Engine" : "Request A Demo"}</span>
              </button>

              <button
                onClick={() => setIsVideoModalOpen(true)}
                className={`flex items-center gap-3 font-heading font-semibold text-sm group cursor-pointer ${
                  isDark ? 'text-slate-200 hover:text-white' : 'text-slate-800 hover:text-slate-900'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
                  <Play size={18} className="fill-white ml-0.5" />
                </div>
                <span>Watch Intro Video</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Cyber Shield Graphic (NO PERSON PHOTO) */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6">
            {/* Background Circuit Trace Glow */}
            <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-pink-600/10 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Central Shield Graphic Container */}
            <div className="relative w-full max-w-[460px] aspect-[4/5] flex items-center justify-center">
              
              {/* Main Shield Border Frame with High-Tech Server/Cybersecurity Graphic */}
              <div className={`relative w-full h-full p-2 rounded-[40px] shadow-2xl overflow-hidden flex items-center justify-center border-4 ${
                isDark ? 'bg-slate-900 border-slate-700/80 shadow-purple-900/40' : 'bg-white border-white shadow-slate-300/60'
              }`}>
                <img 
                  src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop" 
                  alt="Kalki Cyber Security Engine" 
                  className="w-full h-full object-cover rounded-[34px]"
                />
                
                {/* Tech Ambient Overlay with Circuit Grid */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-slate-950/40 to-transparent opacity-80" />

                {/* Center Badge Icon inside shield */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-orange-500 p-0.5 shadow-2xl shadow-purple-500/50 animate-pulse">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white fill-purple-500/30" />
                    </div>
                  </div>
                  <h4 className="text-xl font-heading font-extrabold text-white tracking-wide">
                    KALKI SECURITY ENGINE
                  </h4>
                  <p className="text-xs font-mono text-purple-200 bg-purple-900/60 border border-purple-500/40 px-3 py-1 rounded-full">
                    Deterministic • AST Reachable
                  </p>
                </div>
              </div>

              {/* Floating Badge 1: Top Left Pink/Red Lock */}
              <div className="absolute -top-4 -left-4 bg-gradient-to-tr from-red-500 to-pink-500 p-3 rounded-2xl shadow-xl shadow-red-500/30 text-white animate-bounce-slow">
                <Lock size={22} className="fill-white/20" />
              </div>

              {/* Floating Badge 2: Bottom Left Blue Glass Fingerprint Card */}
              <div className="absolute bottom-6 -left-8 bg-slate-900/95 backdrop-blur-md border border-blue-500/40 p-4 rounded-2xl shadow-2xl shadow-blue-500/30 flex items-center justify-center text-blue-400">
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
          <div className={`border rounded-2xl p-6 shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <p className={`text-xs font-mono font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Auto-Patch Rate</p>
            <p className="text-4xl font-heading font-extrabold text-emerald-500 mt-2">
              {efficacyMetrics?.clean_auto_patch_rate ?? 0}%
            </p>
          </div>
          <div className={`border rounded-2xl p-6 shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <p className={`text-xs font-mono font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Safely-Handled Rate</p>
            <p className="text-4xl font-heading font-extrabold text-blue-500 mt-2">
              {efficacyMetrics?.safely_handled_rate ?? 0}%
            </p>
          </div>
          <div className={`border rounded-2xl p-6 shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <p className={`text-xs font-mono font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>False Positive Noise</p>
            <p className={`text-4xl font-heading font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              0%
            </p>
          </div>
          <div className={`border rounded-2xl p-6 shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <p className={`text-xs font-mono font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Verification Speed</p>
            <p className="text-4xl font-heading font-extrabold text-orange-500 mt-2">
              &lt; 5 ms
            </p>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className={`max-w-[1280px] mx-auto px-8 py-20 space-y-12 relative z-10 border-t ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <div className="text-center space-y-3">
          <span className={`text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
            isDark ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-700 bg-purple-50 border-purple-200'
          }`}>
            Autonomous Defense-in-Depth
          </span>
          <h2 className={`text-3xl md:text-5xl font-heading font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            How Kalki Transforms Vulnerability Remediation
          </h2>
          <p className={`max-w-xl mx-auto text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Traditional tools bury engineering teams in hundreds of unreachable CVE alerts. Kalki replaces noise with mathematically verified fixes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className={`border rounded-2xl p-8 shadow-sm hover:-translate-y-1.5 transition-all duration-200 space-y-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:border-purple-500/40' : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-xl'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
              <Layers size={24} />
            </div>
            <h3 className={`text-xl font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              AST Reachability Analysis
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Maps vulnerable dependency symbols directly against your application's Abstract Syntax Tree. Automatically categorizes alerts as Runtime Reachable or Unreachable Code to eliminate noise.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={`border rounded-2xl p-8 shadow-sm hover:-translate-y-1.5 transition-all duration-200 space-y-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/40' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
              <Zap size={24} />
            </div>
            <h3 className={`text-xl font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Live PoC Exploit Verification
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Attacks both the vulnerable and patched copies of your codebase with real Proof of Concept payloads (such as ReDoS or Prototype Pollution) to mathematically prove the vulnerability is mitigated.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={`border rounded-2xl p-8 shadow-sm hover:-translate-y-1.5 transition-all duration-200 space-y-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xl'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <h3 className={`text-xl font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Automated PR Composition
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Runs your existing regression test suite to guarantee zero breaking changes, then drafts a comprehensive Markdown Pull Request ready for 1-click publishing to GitHub.
            </p>
          </div>
        </div>
      </section>

      {/* PIPELINE SEQUENCE SECTION */}
      <section id="pipeline" className="max-w-[1280px] mx-auto px-8 py-20 relative z-10">
        <div className={`border rounded-3xl p-8 md:p-14 shadow-2xl space-y-10 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-500">
              Deterministic Sequence
            </span>
            <h3 className={`text-3xl md:text-4xl font-heading font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              End-to-End Pipeline Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className={`border rounded-2xl p-6 space-y-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/70' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="font-mono text-xs font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md inline-block">
                01 • SCAN
              </span>
              <h4 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>BFS Graph Traversal</h4>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Parses package-lock.json up to 3 depth levels against OSV advisory databases.</p>
            </div>

            <div className={`border rounded-2xl p-6 space-y-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/70' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="font-mono text-xs font-bold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md inline-block">
                02 • FILTER
              </span>
              <h4 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>AST Context Mapping</h4>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Determines if vulnerable function signatures are invoked by application code.</p>
            </div>

            <div className={`border rounded-2xl p-6 space-y-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/70' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md inline-block">
                03 • VERIFY
              </span>
              <h4 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>PoC & Regression Tests</h4>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Applies patch, runs malicious PoC payloads, and executes automated test suites.</p>
            </div>

            <div className={`border rounded-2xl p-6 space-y-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/70' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="font-mono text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-md inline-block">
                04 • DELIVER
              </span>
              <h4 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>GitHub PR Draft</h4>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Generates verifiable Markdown pull request with timing logs and AST proof.</p>
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
      <footer className={`max-w-[1440px] mx-auto px-8 py-10 border-t flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-4 relative z-10 ${
        isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-pink-500" />
          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Kalki</span>
          <span>• Automated Security Patch Engine</span>
        </div>
        <div className="flex items-center gap-6">
          <span>GitHub Single Sign-On</span>
          <span>AES-256-GCM Encrypted</span>
          <span>Firestore Cloud Native</span>
        </div>
      </footer>

      {/* INTRO VIDEO MODAL POPUP */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button 
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-500 p-0.5 mx-auto shadow-xl shadow-purple-500/25">
              <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                <Video size={28} className="text-purple-500" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full inline-block">
                Feature Announcement
              </span>
              <h3 className="text-xl font-heading font-extrabold">
                Video Walkthrough Coming Soon
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                The full interactive video demonstration of the Kalki AST Reachability & Auto-Patch Engine is currently being recorded. You can explore the live engine right now in your dashboard!
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-heading font-semibold border cursor-pointer ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsVideoModalOpen(false);
                  if (user) onLaunchDashboard();
                  else handleSignIn();
                }}
                className="bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-95 text-white font-heading font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>{user ? 'Launch Dashboard' : 'Sign In to Try'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST DEMO MODAL POPUP */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button 
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 p-0.5 mx-auto shadow-xl shadow-orange-500/25">
              <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                <Calendar size={28} className="text-orange-500" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full inline-block">
                Demo Booking
              </span>
              <h3 className="text-xl font-heading font-extrabold">
                Demo Requests Coming Soon
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Interactive 1-on-1 demo scheduling will be available shortly. In the meantime, you can sign in with GitHub right now to test the live Kalki Security Engine!
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-heading font-semibold border cursor-pointer ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsDemoModalOpen(false);
                  if (user) onLaunchDashboard();
                  else handleSignIn();
                }}
                className="bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-95 text-white font-heading font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>{user ? 'Launch Dashboard' : 'Sign In to Try Live'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
