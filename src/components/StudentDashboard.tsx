import React, { useState, useEffect } from "react";
import { 
  BarChart3, Inbox, Calendar, FileText, Send, CheckCircle2, Clock, 
  AlertCircle, Sparkles, BookOpen, Layers, LogOut, Bell, ChevronDown, Check
} from "lucide-react";
import { User, Student, RegistrationRequest, Notification } from "../types";

interface StudentDashboardProps {
  studentUser: User;
  onLogout: () => void;
}

export default function StudentDashboard({ studentUser, onLogout }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "requests" | "announcements" | "profile">("attendance");
  
  // Data state
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [overallStats, setOverallStats] = useState<any>(null);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Expanded subject history logs tracking
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Form states - Request
  const [reqTitle, setReqTitle] = useState("");
  const [reqDescription, setReqDescription] = useState("");
  const [reqType, setReqType] = useState<"leave" | "correction">("leave");
  const [reqDate, setReqDate] = useState("");

  // New Date Range local states for leave requests
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Profile changepassword states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      triggerToast("error", "All fields are required.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      triggerToast("error", "New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentUser.id,
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update error.");
      triggerToast("success", "Password profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to update profile password.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Find matches using student's profile identifier
      // Wait, let's call the specific endpoint to fetch stats and details
      const res = await fetch(`/api/students/${studentUser.id}/attendance`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rosters not loaded.");

      setStudentProfile(data.studentProfile);
      setOverallStats(data.overallStats);
      setSubjectStats(data.subjectStats);

      // Load requests matching student
      const reqRes = await fetch(`/api/requests?studentId=${studentUser.id}`);
      const reqData = await reqRes.json();
      setRequests(reqData);

      // Load inbox notifications
      const notifRes = await fetch(`/api/notifications?userId=${studentUser.id}&role=student`);
      const notifData = await notifRes.json();
      setNotifications(notifData);
    } catch (err: any) {
      console.error("Failed to load student profiles", err);
      triggerToast("error", err.message || "Failed to load individual statistics.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle || !reqDescription || !reqType) {
      triggerToast("error", "Fill out all mandatory fields.");
      return;
    }

    let payloadDate = reqDate || null;
    let extraFields: any = {};

    if (reqType === "leave") {
      if (!fromDate || !toDate) {
        triggerToast("error", "Both From Date and To Date are required for leave requests.");
        return;
      }
      if (new Date(toDate) < new Date(fromDate)) {
        triggerToast("error", "To Date cannot be earlier than From Date.");
        return;
      }
      const diffTime = Math.abs(new Date(toDate).getTime() - new Date(fromDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      extraFields = {
        fromDate,
        toDate,
        totalLeaveDays: diffDays
      };
      payloadDate = fromDate;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentUser.id, // normalized to check backend profiles inside server
          title: reqTitle,
          description: reqDescription,
          type: reqType,
          date: payloadDate,
          ...extraFields
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRequests([data, ...requests]);
      setReqTitle("");
      setReqDescription("");
      setReqDate("");
      setFromDate("");
      setToDate("");
      triggerToast("success", `Your ${reqType} request has been submitted to administrations.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Request submission error.");
    } finally {
      setLoading(false);
    }
  };

  const handleReadNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Could not mark alert read", err);
    }
  };

  const toggleSubjectExpand = (subId: string) => {
    setExpandedSubjectId(expandedSubjectId === subId ? null : subId);
  };

  // Check critical eligibility threshold (standard college attendance rule e.g. 75%)
  const overallPct = overallStats?.overallPercentage ?? 100.0;
  const isEligible = overallPct >= 75.0;

  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div id="student-dashboard" className="min-h-screen flex flex-col bg-slate-50/50 font-sans">
      
      {/* Top Header - Glossy Crisp Light SaaS layout */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">
                EduTrack<span className="text-emerald-600 font-extrabold">360</span>
              </h1>
              <p className="text-[10.5px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Student Academic Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex px-2.5 py-1 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono border border-slate-200/80 font-bold">
              Roll No: {studentProfile?.rollNumber || "Registering..."}
            </span>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <button
              id="student-logout-btn"
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-900 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Live Toaster - modern sleek slide down card rather than bouncy raw alert */}
        {toast && (
          <div id="student-toast-alert" className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-md border transition-all duration-300 ${
            toast.type === "success" 
              ? "bg-slate-900 border-emerald-500/20 text-emerald-400" 
              : "bg-slate-900 border-rose-500/20 text-rose-400"
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide uppercase font-mono">{toast.message}</span>
          </div>
        )}

        {/* Left Hand Navigation Rail */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgb(0,0,0,0.02)] border border-slate-200/80 p-3 space-y-1.5">
            <div className="px-3 py-1.5 border-b border-slate-100/50">
              <h3 className="font-display font-bold text-[11px] text-slate-400 uppercase tracking-widest">Workspace Core</h3>
            </div>
            <nav className="space-y-1">
              <button
                id="student-tab-att-btn"
                onClick={() => setActiveTab("attendance")}
                className={`w-full px-3.5 py-2.5 rounded-lg text-left text-sm font-semibold transition-all flex items-center justify-between ${
                  activeTab === "attendance" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Attendance Analysis</span>
                </div>
              </button>

              <button
                id="student-tab-req-btn"
                onClick={() => setActiveTab("requests")}
                className={`w-full px-3.5 py-2.5 rounded-lg text-left text-sm font-semibold transition-all flex items-center justify-between ${
                  activeTab === "requests" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>System Requests</span>
                </div>
              </button>

              <button
                id="student-tab-ann-btn"
                onClick={() => setActiveTab("announcements")}
                className={`w-full px-3.5 py-2.5 rounded-lg text-left text-sm font-semibold transition-all flex items-center justify-between ${
                  activeTab === "announcements" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 shrink-0" />
                  <span>Inboxes & Alerts</span>
                </div>
                {unreadNotifsCount > 0 && (
                  <span id="student-unread-notif-badge" className="px-2 py-0.5 bg-rose-500 rounded-full text-[10px] text-white font-extrabold font-mono">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              <button
                id="student-tab-prof-btn"
                onClick={() => {
                  setActiveTab("profile");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                className={`w-full px-3.5 py-2.5 rounded-lg text-left text-sm font-semibold transition-all flex items-center justify-between ${
                  activeTab === "profile" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Security & Profile</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Quick Stats Guard Ring */}
          {overallStats && (
            <div className={`rounded-xl p-5 text-slate-800 bg-white shadow-[0_1px_3px_rgb(0,0,0,0.02)] border ${
              isEligible 
                ? "border-emerald-250 bg-emerald-50/5" 
                : "border-rose-250 bg-rose-50/5"
            }`}>
              <div className="text-center space-y-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Classroom Eligibility</p>
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" className="stroke-slate-100" strokeWidth="6" fill="none" />
                    <circle cx="48" cy="48" r="40" 
                      className={isEligible ? "stroke-emerald-500" : "stroke-rose-500"} 
                      strokeWidth="6" 
                      fill="none" 
                      strokeDasharray="251.2"
                      strokeDashoffset={(251.2 - (251.2 * overallPct) / 100).toString()}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold font-display text-slate-900">{overallPct}%</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{isEligible ? "Eligible" : "Attendance Shortage"}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isEligible 
                      ? "Eligible for examinations. Minimum 75% criteria met." 
                      : "Attendance is critically low. Shortage detected."}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Central Display Panels */}
        <div className="lg:col-span-3 space-y-6">

          {/* TAB 1: ATTENDANCE ANALYSIS */}
          {activeTab === "attendance" && (
            <div id="student-panel-attendance" className="space-y-6 animate-fade-in">
              
              {/* Core Cards Row */}
              {overallStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Calendar className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium font-sans">Sessions Scheduled</p>
                      <h4 className="text-2xl font-bold font-display text-slate-800">{overallStats.totalClasses}</h4>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium font-sans">Sessions Present</p>
                      <h4 className="text-2xl font-bold font-display text-slate-800">{overallStats.totalPresent}</h4>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium font-sans">Sessions Absent</p>
                      <h4 className="text-2xl font-bold font-display text-slate-800">{overallStats.totalAbsent}</h4>
                    </div>
                  </div>
                </div>
              )}

              {/* Subject Breakdown Table list */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider">Curriculum Subject Attendance</h3>
                  <span className="text-xs text-slate-400 font-medium">Click on any subject to inspect daily history logs</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {subjectStats.length === 0 ? (
                    <p id="student-no-subjects-msg" className="text-xs text-slate-400 py-12 text-center animate-pulse">Your curriculum currently has no recorded subjects. Contact Administrator.</p>
                  ) : (
                    subjectStats.map((sub: any) => {
                      const isExpanded = expandedSubjectId === sub.subjectId;
                      const subPct = sub.percentage;
                      return (
                        <div key={sub.subjectId} className="py-4 space-y-3">
                          <div 
                            onClick={() => toggleSubjectExpand(sub.subjectId)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 p-2 rounded-lg transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-slate-900 text-slate-100 font-mono text-[9px] font-bold rounded uppercase">{sub.subjectCode}</span>
                                <h4 className="font-semibold text-slate-800 font-sans text-sm">{sub.subjectName}</h4>
                              </div>
                              <p className="text-xs text-slate-400 font-medium font-sans">
                                Attended: <strong className="text-slate-700">{sub.presentSessions}</strong> / <span className="text-slate-500">{sub.totalSessions} sessions scheduled</span>
                              </p>
                            </div>

                            {/* Percentage progress bar */}
                            <div className="flex items-center gap-4 shrink-0 sm:self-center">
                              <div className="w-32 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    subPct >= 75.0 ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${subPct}%` }}
                                ></div>
                              </div>
                              <span className={`w-14 text-right font-bold text-sm ${
                                subPct >= 75.0 ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {subPct}%
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>

                          {/* Expanded History Logs */}
                          {isExpanded && (
                            <div className="bg-slate-50/60 p-4 border border-slate-200/30 rounded-xl space-y-2 animate-fade-in animate-duration-200">
                              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display mb-2">Class Attendance Log history</h5>
                              {sub.history.length === 0 ? (
                                <p className="text-xs font-medium text-slate-400 py-4 text-center">No lessons recorded yet for this subject.</p>
                              ) : (
                                <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-250 overflow-hidden text-xs max-h-48 overflow-y-auto">
                                  {sub.history.map((log: any, idx: number) => (
                                    <div key={idx} className="p-3 flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <p className="font-semibold text-slate-700">{log.date}</p>
                                        <p className="text-[10px] text-slate-400">Marked by {log.markedBy}</p>
                                      </div>
                                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[9px] ${
                                        log.status === "present"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-rose-100 text-rose-800"
                                      }`}>
                                        {log.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ADMINISTRATIVE REQUESTS */}
          {activeTab === "requests" && (
            <div id="student-panel-requests" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Submit New Request Wizard */}
                <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Send className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-display font-semibold text-slate-800 text-md">Submit Request</h2>
                  </div>
                  <form onSubmit={handleCreateRequest} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Request Category</label>
                      <select
                        id="req-type-select"
                        value={reqType}
                        onChange={(e) => setReqType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 font-medium text-slate-700"
                      >
                        <option value="leave">Leave of Absence Application</option>
                        <option value="correction">Attendance Correction Request</option>
                      </select>
                    </div>

                    {reqType === "leave" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                          <input
                            id="req-from-date"
                            type="date"
                            required
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                          <input
                            id="req-to-date"
                            type="date"
                            required
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        {fromDate && toDate && (
                          <div id="total-leave-days-display" className="col-span-2 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-800 text-[11px] font-mono font-medium flex items-center justify-between">
                            <span>TOTAL LEAVE DURATION:</span>
                            <span className="font-bold text-xs">
                              {(() => {
                                if (new Date(toDate) < new Date(fromDate)) return "Invalid date sequence!";
                                const diffTime = Math.abs(new Date(toDate).getTime() - new Date(fromDate).getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                return `${diffDays} ${diffDays === 1 ? "day" : "days"} (inclusive)`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Target Date (Optional)</label>
                        <input
                          id="req-date-input"
                          type="date"
                          value={reqDate}
                          onChange={(e) => setReqDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Subject / Header</label>
                      <input
                        id="req-title-input"
                        type="text"
                        required
                        placeholder="e.g. Leave for College Tech Fest"
                        value={reqTitle}
                        onChange={(e) => setReqTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Brief Description / Reasons</label>
                      <textarea
                        id="req-description-input"
                        required
                        rows={4}
                        placeholder="Please supply detailed justifications and attach reference dates where required."
                        value={reqDescription}
                        onChange={(e) => setReqDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none font-medium text-slate-700 placeholder-slate-400"
                      ></textarea>
                    </div>

                    <button
                      id="req-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-lg text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> File Request
                    </button>
                  </form>
                </div>

                {/* Request list logs */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                      <span>Submitted Requests History</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{requests.length} total</span>
                    </h3>

                    <div className="mt-3 divide-y divide-slate-100 max-h-120 overflow-y-auto">
                      {requests.length === 0 ? (
                        <p id="student-no-requests-msg" className="text-xs font-medium text-slate-400 py-16 text-center">No requests filed currently.</p>
                      ) : (
                        requests.map(req => (
                          <div key={req.id} className="py-4 space-y-1.5 text-xs font-sans">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 font-bold font-mono text-[9px] uppercase rounded ${
                                  req.type === "leave" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                }`}>
                                  {req.type}
                                </span>
                                <h4 className="font-semibold text-slate-800 text-sm">{req.title}</h4>
                              </div>
                              
                              {/* Status status bubble */}
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                req.status === "pending"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : req.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">{req.description}</p>
                            <div className="text-[10px] text-slate-400 font-medium flex flex-wrap items-center gap-2 pt-1">
                              {req.type === "leave" && req.fromDate && (
                                <span className="text-[10px] text-amber-700 font-bold font-mono bg-amber-50/80 px-2 py-0.5 rounded border border-amber-100">
                                  Leave Range: {req.fromDate} to {req.toDate} ({req.totalLeaveDays} {req.totalLeaveDays === 1 ? "day" : "days"})
                                </span>
                              )}
                              {req.date && req.type !== "leave" && <span>Target Date: <strong className="text-slate-600 font-mono">{req.date}</strong></span>}
                              <span>• Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: ANNOUNCEMENTS AND NOTIFICATIONS */}
          {activeTab === "announcements" && (
            <div id="student-panel-notifications" className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4 animate-fade-in animate-duration-300">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider">Academic Inbox / Notices</h3>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{notifications.length} alerts</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-120 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p id="student-no-notifications-msg" className="text-xs font-medium text-slate-400 py-16 text-center">Your academy inbox is currently clear.</p>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`py-3 flex items-start gap-3 transition-colors rounded-lg p-2.5 border-l-4 ${
                        notif.isRead 
                          ? "bg-white border-slate-200" 
                          : "bg-amber-50/20 border-emerald-500 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        notif.isRead ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        <Bell className="w-4.5 h-4.5 shrink-0" />
                      </div>
                      <div className="flex-1 space-y-0.5 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold text-sm ${notif.isRead ? "text-slate-600" : "text-slate-900"}`}>{notif.title}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(notif.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                        {!notif.isRead && (
                          <button
                            id={`read-btn-${notif.id}`}
                            onClick={() => handleReadNotification(notif.id)}
                            className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wider hover:underline transition-all cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div id="student-profile-panel" className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 animate-fade-in space-y-6">
              <div className="border-b border-slate-150 pb-3">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Security Credentials Profile</h2>
                <p className="text-xs text-slate-400 font-medium">Protect and update your core student access code.</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md animate-none">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
                  <input
                    id="student-current-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    id="student-new-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    id="student-confirm-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <button
                  id="student-password-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {loading ? "Changing Credentials..." : "Update Security Code"}
                </button>
              </form>
            </div>
          )}

        </div>

      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 EduTrack360. All academic operations encrypted and archived securely. University ERP Platform.</p>
        </div>
      </footer>
    </div>
  );
}
