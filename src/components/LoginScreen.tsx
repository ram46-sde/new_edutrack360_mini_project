import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, User, Lock, ArrowRight, BookOpen } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Setup fields
  const [setupName, setSetupName] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"find_user" | "reset_password">("find_user");
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryRole, setRecoveryRole] = useState<"admin" | "faculty" | "student">("student");
  const [recoveredUserId, setRecoveredUserId] = useState("");
  const [recoveredName, setRecoveredName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleVerifyUserForRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername) {
      setError("Please input your login username/email to verify.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: recoveryUsername, role: recoveryRole })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      setRecoveredUserId(data.userId);
      setRecoveredName(data.name);
      setRecoveryStep("reset_password");
      setSuccessMsg(`Welcome, ${data.name}! Please enter your new security password.`);
    } catch (err: any) {
      setError(err.message || "No verified user was fetched.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      setError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: recoveredUserId, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reset password request failed.");
      }

      setSuccessMsg("Your credential password was successfully updated! Please sign in using your new credentials.");
      setUsername(recoveryUsername);
      setIsRecovering(false);
      setRecoveryStep("find_user");
      setRecoveryUsername("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInitStatus();
  }, []);

  const checkInitStatus = async () => {
    try {
      const res = await fetch("/api/auth/init-status");
      const data = await res.json();
      setNeedsSetup(data.needsAdminSetup);
    } catch (err) {
      console.error("Failed to fetch initial state", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please key in all required fields.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login credentials failed.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName || !setupUsername || !setupPassword) {
      setError("Please fill out all setup fields.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setupName,
          username: setupUsername,
          password: setupPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Configuration error.");
      }

      setSuccessMsg("Administrator account successfully created! Proceeding to Sign In.");
      setUsername(setupUsername);
      setPassword(setupPassword);
      setNeedsSetup(false);
    } catch (err: any) {
      setError(err.message || "Setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen w-full bg-[#eef0f6] flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-[32px] overflow-hidden flex shadow-2xl border border-slate-200/50 min-h-[650px] transition-all duration-300">
        
        {/* Left Column: Slate Dark Login Portal (Sleek minimalist layout inspired by the reference) */}
        <div className="w-full md:w-[45%] bg-[#111113] text-slate-100 p-8 md:p-10 flex flex-col justify-between relative">
          
          {/* Top Logo */}
          <div className="flex items-center gap-2.5 z-10">
            <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-lavender-450 text-lavender-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-extrabold text-sm tracking-tight text-white">EduTrack<span className="text-lavender-400 font-extrabold">360</span></span>
              <span className="block text-[8px] text-slate-500 font-mono tracking-widest font-bold uppercase">Console Access</span>
            </div>
          </div>

          <div className="my-auto py-6 z-10">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div>
                <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
                  {isRecovering ? "Password Recovery" : needsSetup ? "Initial setup" : "Login"}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isRecovering 
                    ? "Verify your account identity to regain entry" 
                    : needsSetup 
                      ? "Establish primary administrator profile credentials" 
                      : "Enter your account details below"}
                </p>
              </div>

              {error && (
                <div id="login-error-alert" className="p-3 bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl text-xs text-center font-medium animate-fade-in">
                  {error}
                </div>
              )}

              {successMsg && (
                <div id="login-success-alert" className="p-3 bg-lavender-500/10 border border-lavender-500/25 text-lavender-300 rounded-xl text-xs text-center font-medium animate-fade-in">
                  {successMsg}
                </div>
              )}

              {needsSetup ? (
                /* First-Time Setup Wizard */
                <form id="setup-form" onSubmit={handleSetup} className="space-y-4">
                  <div className="p-3 bg-lavender-505/10 bg-lavender-500/5 border border-lavender-500/10 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-lavender-400 block mb-0.5 font-bold">Workspace Initialization:</strong> 
                    No registered administrator detected. Create your core administrator credentials to initialize the academic system.
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 text-slate-400 uppercase tracking-widest mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        id="setup-name"
                        type="text"
                        required
                        placeholder="e.g. Director of Admissions"
                        value={setupName}
                        onChange={(e) => setSetupName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold"
                      />
                      <User className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 text-slate-400 uppercase tracking-widest mb-1.5">
                      Admin Username
                    </label>
                    <div className="relative">
                      <input
                        id="setup-username"
                        type="text"
                        required
                        placeholder="e.g. director360"
                        value={setupUsername}
                        onChange={(e) => setSetupUsername(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold"
                      />
                      <Shield className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 text-slate-400 uppercase tracking-widest mb-1.5">
                      Master Password
                    </label>
                    <div className="relative">
                      <input
                        id="setup-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold font-mono"
                      />
                      <Lock className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                    </div>
                  </div>

                  <button
                    id="setup-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-lavender-600 hover:bg-lavender-500 active:bg-lavender-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-lavender-650/10 active:scale-98"
                  >
                    {loading ? "Configuring Database..." : "Register Master Admin"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : isRecovering ? (
                /* Password Recovery Flow */
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2.5 flex items-center justify-between">
                    <h2 className="text-[10px] font-bold uppercase font-mono tracking-wider text-lavender-400">
                      {recoveryStep === "find_user" ? "Step 1: Verify Profile" : "Step 2: Reset Access"}
                    </h2>
                    <button
                      id="cancel-recovery-btn"
                      onClick={() => {
                        setError(null);
                        setSuccessMsg(null);
                        setIsRecovering(false);
                        setRecoveryStep("find_user");
                      }}
                      className="text-[9px] text-slate-400 hover:text-white transition-colors uppercase font-bold tracking-wider cursor-pointer bg-white/5 px-2 py-1 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>

                  {recoveryStep === "find_user" ? (
                    <form id="recovery-find-form" onSubmit={handleVerifyUserForRecovery} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Your System Role
                        </label>
                        <select
                          id="recovery-role-select"
                          value={recoveryRole}
                          onChange={(e) => setRecoveryRole(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:bg-[#1f1f23] focus:outline-none focus:border-lavender-400 text-xs font-semibold cursor-pointer"
                        >
                          <option className="bg-[#111113] text-white" value="student">Enrolled Student</option>
                          <option className="bg-[#111113] text-white" value="faculty">Faculty Member</option>
                          <option className="bg-[#111113] text-white" value="admin">System Administrator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Username / Email Address
                        </label>
                        <div className="relative">
                          <input
                            id="recovery-username-input"
                            type="text"
                            required
                            placeholder="e.g. alanturing"
                            value={recoveryUsername}
                            onChange={(e) => setRecoveryUsername(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold"
                          />
                          <User className="absolute left-3 top-3 text-slate-500 w-3.5 h-3.5" />
                        </div>
                      </div>

                      <button
                        id="verify-recovery-btn"
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-lavender-600 hover:bg-lavender-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-98"
                      >
                        {loading ? "Searching Accounts..." : "Locate Account"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <form id="recovery-reset-form" onSubmit={handleResetPasswordRecovery} className="space-y-4">
                      <div className="p-3 bg-lavender-500/10 border border-lavender-500/25 rounded-xl text-xs text-lavender-300 flex flex-col gap-0.5 font-medium">
                        <span className="font-bold text-lavender-400 block text-[9px] uppercase tracking-widest">Identity Confirmed</span>
                        <span className="text-slate-100 font-semibold">{recoveredName} ({recoveryRole.toUpperCase()})</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          New Security Password
                        </label>
                        <div className="relative">
                          <input
                            id="recovery-password-input"
                            type="password"
                            required
                            placeholder="Minimum 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold font-mono"
                          />
                          <Lock className="absolute left-3 top-3 text-slate-500 w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Confirm Security Password
                        </label>
                        <div className="relative">
                          <input
                            id="recovery-confirm-password-input"
                            type="password"
                            required
                            placeholder="Repeat new password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold font-mono"
                          />
                          <Lock className="absolute left-3 top-3 text-slate-500 w-3.5 h-3.5" />
                        </div>
                      </div>

                      <button
                        id="save-recovery-password-btn"
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-lavender-600 hover:bg-lavender-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-98"
                      >
                        {loading ? "Saving Password..." : "Update Password"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Standard Login Portal */
                <form id="login-form" onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 text-slate-400 uppercase tracking-widest mb-1.5">
                      Username / Roll No.
                    </label>
                    <div className="relative">
                      <input
                        id="login-username"
                        type="text"
                        required
                        placeholder="e.g. alanturing"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold"
                      />
                      <User className="absolute left-3 top-3.5 text-slate-500 w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[9px] font-bold text-slate-450 text-slate-400 uppercase tracking-widest">
                        Password
                      </label>
                      <button
                        id="forgot-password-link"
                        type="button"
                        onClick={() => {
                          setError(null);
                          setSuccessMsg(null);
                          setIsRecovering(true);
                          setRecoveryStep("find_user");
                          setRecoveryUsername(username);
                        }}
                        className="text-lavender-400 hover:text-lavender-300 font-semibold text-xs cursor-pointer transition-colors"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-lavender-400 transition-all text-xs font-semibold font-mono"
                      />
                      <Lock className="absolute left-3 top-3.5 text-slate-500 w-3.5 h-3.5" />
                    </div>
                  </div>

                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-lavender-600 hover:bg-lavender-500 text-white font-semibold rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.15)] active:scale-98 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {loading ? "Signing in..." : "Login"}
                    <ArrowRight className="w-3.5 h-3.5 text-lavender-200" />
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          {/* Bottom Security Footer */}
          <div className="border-t border-white/5 pt-4 text-center md:text-left z-10">
            <span className="text-[9.5px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
              EduTrack360 System • Role Secured Console
            </span>
          </div>
        </div>

        {/* Right Column: Slogan & Art Panel (Premium solid lavender with abstract shapes and outlines inspired by reference) */}
        <div className="hidden md:flex md:w-[55%] bg-[#8B5CF6] text-white p-12 flex-col justify-between relative overflow-hidden">
          
          {/* Wave/Blob background decorations using inline SVGs for professional vector art */}
          <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay">
            <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="absolute -top-32 -right-32 w-[350px] h-[350px]">
              <path fill="#ffffff" d="M42,-14.1C47.2,-2.1,39.1,17.2,25.1,28.6C11,40,-9.1,43.5,-23.5,35C,-37.9,26.6,-46.6,6.1,-41.8,-11.5C-37,-29.1,-18.5,-43.8,1.4,-44.3C21.4,-44.8,42.7,-31.1,42,-14.1Z" transform="translate(250 250)" />
            </svg>
            <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="absolute -bottom-24 -left-20 w-[400px] h-[400px] opacity-80">
              <path fill="#ffffff" d="M37,-27.1C45.2,-13,47.1,7.2,40.1,23.3C33,39.4,17.1,51.3,-1.4,52.3C-19.9,53.3,-41,43.4,-49.1,26.2C-57.1,9.1,-52.1,-15.3,-40.1,-30.2C-28.1,-45.1,-9.1,-50.5,5.1,-54.1C19.3,-57.7,28.8,-41.2,37,-27.1Z" transform="translate(250 250)" />
            </svg>
          </div>

          {/* Dynamic Top Badge detailing system status */}
          <div className="flex items-center justify-between z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
              <Sparkles className="w-3 h-3 text-lavender-200 animate-pulse" />
              <span className="text-[9.5px] uppercase tracking-widest font-bold text-lavender-100">LATEST v4.2 PRO</span>
            </div>
          </div>

          {/* Core Wording mandated by UX/Text Rules and Reference */}
          <div className="space-y-4 max-w-sm z-10 my-auto">
            <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.1] text-white">
              Welcome to EduTrack360
            </h2>
            <p className="text-lavender-100/90 text-sm font-medium tracking-wide">
              Smart Attendance & Academic Management Platform
            </p>
            <p className="text-lavender-100/70 text-xs leading-relaxed max-w-xs font-normal">
              Enter details on the left console to securely access attendance records, student metrics, and course allocations.
            </p>
          </div>

          {/* Clean line-art composition resembling student figures and laptop outlines from reference */}
          <div className="absolute right-4 bottom-4 w-72 h-44 opacity-85 z-10 hidden lg:block pointer-events-none">
            <svg viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Giant document board outline */}
              <rect x="70" y="50" width="120" height="110" rx="10" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
              <rect x="80" y="60" width="100" height="90" rx="6" fill="white" fillOpacity="0.05" stroke="white" strokeWidth="1.5" />
              <line x1="95" y1="78" x2="165" y2="78" stroke="white" strokeWidth="2" opacity="0.4" />
              <line x1="95" y1="94" x2="150" y2="94" stroke="white" strokeWidth="2" opacity="0.4" />
              <line x1="95" y1="110" x2="135" y2="110" stroke="white" strokeWidth="2" opacity="0.4" />
              
              {/* Sitting Student on device (Right) */}
              <circle cx="210" cy="65" r="8" stroke="white" strokeWidth="1.5" fill="#8B5CF6" />
              {/* Back and neck outline */}
              <path d="M210 73 L205 90 L185 93 L180 115" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              {/* Legs out towards laptop */}
              <path d="M185 93 L172 96 L165 115" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              {/* Small floating laptop outline */}
              <path d="M150 90 L163 90 L166 80" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="166" cy="80" r="1.5" fill="white" />

              {/* Standing student looking at phone (Left) */}
              <circle cx="50" cy="85" r="7" stroke="white" strokeWidth="1.5" fill="#8B5CF6" />
              <path d="M50 92 L50 120 L40 145" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M50 120 L58 145" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              {/* Arms holding phone outline */}
              <path d="M50 98 L38 102 L34 100" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="30" y="96" width="3" height="6" rx="0.5" fill="white" transform="rotate(15 30 96)" />
              
              {/* Decorative botanic details */}
              <path d="M240 150 C240 120 260 120 260 150 Z" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="1" />
              <path d="M255 150 C255 130 270 130 270 150 Z" fill="white" fillOpacity="0.08" stroke="white" strokeWidth="1" />
              <line x1="245" y1="150" x2="245" y2="135" stroke="white" strokeWidth="1" opacity="0.3" />
              <line x1="260" y1="150" x2="260" y2="140" stroke="white" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>

          <div className="flex items-center justify-between z-10 text-[10.5px] text-lavender-200/65 font-mono">
            <span>UNIVERSITY ATTENDANCE MANAGEMENT</span>
            <span>SECURE LINK</span>
          </div>
        </div>

      </div>
    </div>
  );
}
