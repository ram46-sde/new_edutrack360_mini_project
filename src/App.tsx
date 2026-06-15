import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import FacultyDashboard from "./components/FacultyDashboard";
import StudentDashboard from "./components/StudentDashboard";
import type { User } from "./types";
import { BookOpen, Sparkles } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if an active session exists in localStorage
    const savedUser = localStorage.getItem("edutrack360_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse persistent user session", err);
        localStorage.removeItem("edutrack360_user");
      }
    }
    setSessionLoading(false);
  }, []);

  const handleLoginSuccess = (userPayload: User) => {
    setCurrentUser(userPayload);
    localStorage.setItem("edutrack360_user", JSON.stringify(userPayload));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("edutrack360_user");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#faf9ff] flex flex-col items-center justify-center text-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-2xl shadow-[0_4px_24px_rgba(139,92,246,0.08)] border border-lavender-100 text-lavender-500 animate-bounce">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">EduTrack360</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">SECURE INSTANCE GATEWAY</p>
          </div>
        </div>
      </div>
    );
  }

  // Active Router Routing Gateways
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  switch (currentUser.role) {
    case "admin":
      return <AdminDashboard adminUser={currentUser} onLogout={handleLogout} />;
    case "faculty":
      return <FacultyDashboard facultyUser={currentUser} onLogout={handleLogout} />;
    case "student":
      return <StudentDashboard studentUser={currentUser} onLogout={handleLogout} />;
    default:
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9ff] text-slate-800 font-sans p-6">
          <div className="p-6 bg-white border border-rose-100 rounded-2xl max-w-sm text-center space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <h2 className="font-display font-semibold text-rose-600 text-base">Role Resolution Error</h2>
            <p className="text-slate-500 text-xs leading-relaxed">Your account profile does not contain a recognized role. Please re-authenticate or contact system administrators.</p>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      );
  }
}

