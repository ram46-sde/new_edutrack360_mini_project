import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, User, Lock, ArrowRight, BookOpen, GraduationCap } from "lucide-react";

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
    <div id="login-container" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative font-sans px-4">
      {/* Abstract background gradient overlays resembling premium SaaS index pages */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl translate-y-1/2"></div>

      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/70 p-8 z-10 relative"
      >
        {/* Soft logo and title matching Stripe/Notion visual styles */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-900 text-white shadow-md mb-4.5 transition-transform hover:scale-105">
            <BookOpen className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            EduTrack<span className="text-emerald-600 font-extrabold">360</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-widest font-mono font-semibold">
            Unified University ERP Console
          </p>
        </div>

        {error && (
          <div id="login-error-alert" className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-center font-medium animate-fade-in">
            {error}
          </div>
        )}

        {successMsg && (
          <div id="login-success-alert" className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center font-medium animate-fade-in">
            {successMsg}
          </div>
        )}

        {needsSetup ? (
          /* First-Time Setup Wizard */
          <form id="setup-form" onSubmit={handleSetup} className="space-y-4.5">
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-850 flex items-start gap-2.5 mb-2">
              <Sparkles className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                <strong>Workspace Setup:</strong> No registered administrator detected. Create your core administrator credentials to initialize the academic system.
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-medium"
                />
                <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-medium"
                />
                <Shield className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-mono font-medium"
                />
                <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <button
              id="setup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              {loading ? "Configuring Database..." : "Register Master Admin"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : isRecovering ? (
          /* Password Recovery Flow */
          <div className="space-y-4.5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase font-mono tracking-wider text-emerald-650">
                {recoveryStep === "find_user" ? "1. Locate Profile Credentials" : "2. Set New Access Code"}
              </h2>
              <button
                id="cancel-recovery-btn"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setIsRecovering(false);
                  setRecoveryStep("find_user");
                }}
                className="text-[10px] text-slate-450 hover:text-slate-900 transition-colors uppercase font-bold tracking-wider cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                Go Back
              </button>
            </div>

            {recoveryStep === "find_user" ? (
              <form id="recovery-find-form" onSubmit={handleVerifyUserForRecovery} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Your System Role
                  </label>
                  <select
                    id="recovery-role-select"
                    value={recoveryRole}
                    onChange={(e) => setRecoveryRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 text-sm font-medium cursor-pointer"
                  >
                    <option value="student">Enrolled Student</option>
                    <option value="faculty">Faculty Member</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Username / Registered Email
                  </label>
                  <div className="relative">
                    <input
                      id="recovery-username-input"
                      type="text"
                      required
                      placeholder="Enter system username or email"
                      value={recoveryUsername}
                      onChange={(e) => setRecoveryUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-medium"
                    />
                    <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  </div>
                </div>

                <button
                  id="verify-recovery-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {loading ? "Searching Accounts..." : "Locate Account"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form id="recovery-reset-form" onSubmit={handleResetPasswordRecovery} className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex flex-col gap-0.5 font-medium">
                  <span className="font-bold text-emerald-600 block text-[10px] uppercase tracking-wider">Target Identity Verified</span>
                  <span className="text-slate-700">{recoveredName} ({recoveryRole.toUpperCase()})</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="recovery-password-input"
                      type="password"
                      required
                      placeholder="Minimum 6 chars, letters & numbers"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-mono font-medium"
                    />
                    <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="recovery-confirm-password-input"
                      type="password"
                      required
                      placeholder="Repeat your password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-mono font-medium"
                    />
                    <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  </div>
                </div>

                <button
                  id="save-recovery-password-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {loading ? "Saving Password..." : "Update Security Password"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Standard Login Portal */
          <form id="login-form" onSubmit={handleLogin} className="space-y-4.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Portal Username / Roll No.
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  required
                  placeholder="Enter system username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-950/5 transition-all text-sm font-medium"
                />
                <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Security Password
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
                  className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Forgot Password?
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-950/5 transition-all text-sm font-mono font-medium"
                />
                <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-[0_4px_12px_rgb(15,23,42,0.1)] active:scale-98 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              {loading ? "Authenticating Account..." : "Enter Workspace"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-5 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-mono font-medium">
                Authorized Roles: Administrator • Faculty • Enrolled Student
              </span>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
