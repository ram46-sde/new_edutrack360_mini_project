import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import FacultyDashboard from "./components/FacultyDashboard";
import StudentDashboard from "./components/StudentDashboard";
import { User } from "./types";
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="flex items-center gap-3 animate-pulse">
          <BookOpen className="w-8 h-8 text-emerald-400" />
          <h1 className="font-display text-2xl font-bold">Connecting to EduTrack360...</h1>
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans p-6">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl max-w-sm text-center space-y-3">
            <h2 className="font-bold text-rose-300 text-md">Role Resolution Error</h2>
            <p className="text-slate-400 text-xs text-center">Your account profile does not contain a recognized role. Please re-authenticate or contact system administrators.</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-rose-300"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      );
  }
}

