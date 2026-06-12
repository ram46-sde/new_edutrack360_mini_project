import React, { useState, useEffect } from "react";
import { 
  Calendar, Check, X, ShieldAlert, BookOpen, Clock, AlertTriangle, 
  Sparkles, CheckCircle2, RefreshCw, Layers, Award, LogOut, Bell
} from "lucide-react";
import { User, Course, Class, Subject, Faculty, Attendance, AttendanceRecord, Notification } from "../types";

interface FacultyDashboardProps {
  facultyUser: User;
  onLogout: () => void;
}

export default function FacultyDashboard({ facultyUser, onLogout }: FacultyDashboardProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Selection state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] // default to today
  );

  // Loaded students and existing attendance
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<{ [studentId: string]: "present" | "absent" }>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New Tab and Search States
  const [activeTab, setActiveTab] = useState<"attendance" | "directory" | "profile">("attendance");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");

  // Profile changepassword states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    fetchFacultyData();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedAssignmentId) {
      loadClassRosterAndAttendance();
    } else {
      setStudents([]);
      setAttendanceState({});
      setIsEditMode(false);
    }
  }, [selectedClassId, selectedAssignmentId, selectedDate]);

  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      // Find matches using faculty identity headers
      const res = await fetch(`/api/faculty/${facultyUser.id}/assignments`, {
        headers: { "x-faculty-id": facultyUser.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAssignments(data);

      // Load related notifications
      const notifRes = await fetch(`/api/notifications?userId=${facultyUser.id}&role=faculty`);
      const notifData = await notifRes.json();
      setNotifications(notifData);

      // Load whole student directory
      const directoryRes = await fetch("/api/students");
      const directoryData = await directoryRes.json();
      setAllStudents(directoryData);
    } catch (err: any) {
      console.error("Failed to fetch faculty details", err);
      triggerToast("error", err.message || "Could not retrieve academic rosters.");
    } finally {
      setLoading(false);
    }
  };

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
          userId: facultyUser.id,
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

  const loadClassRosterAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Get classroom students
      const studRes = await fetch(`/api/classes/${selectedClassId}/students`);
      const studentsData = await studRes.json();
      setStudents(studentsData);

      // 2. Default all students to present in state
      const initialStates: { [studentId: string]: "present" | "absent" } = {};
      studentsData.forEach((s: any) => {
        initialStates[s.id] = "present";
      });

      // 3. Find if attendance has already been marked for this subject, class & date
      const assignment = assignments.find(a => a.id === selectedAssignmentId);
      if (!assignment) return;

      const histRes = await fetch(`/api/attendance/history?classId=${selectedClassId}&subjectId=${assignment.subjectId}`);
      const histData: Attendance[] = await histRes.json();

      const existingSheet = histData.find(a => a.date === selectedDate);
      if (existingSheet) {
        setIsEditMode(true);
        // Map saved records into state overrides
        existingSheet.records.forEach((rec: AttendanceRecord) => {
          initialStates[rec.studentId] = rec.status;
        });
        triggerToast("success", `Detected saved attendance sheet for ${selectedDate}. Editing mode active.`);
      } else {
        setIsEditMode(false);
      }

      setAttendanceState(initialStates);
    } catch (err) {
      console.error("Failed to load attendance roster", err);
      triggerToast("error", "Error loading class student roster.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (studentId: string, status: "present" | "absent") => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAll = (status: "present" | "absent") => {
    const updated = { ...attendanceState };
    students.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceState(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedAssignmentId || !selectedDate) {
      triggerToast("error", "Selection indicators are missing.");
      return;
    }

    const assignment = assignments.find(a => a.id === selectedAssignmentId);
    if (!assignment) return;

    setLoading(true);

    // Format records array
    const recordsPayload = students.map(s => ({
      studentId: s.id,
      status: attendanceState[s.id] || "present"
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-faculty-id": facultyUser.id
        },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: assignment.subjectId,
          date: selectedDate,
          records: recordsPayload,
          markedByFacultyId: facultyUser.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      triggerToast("success", data.message || "Attendance records successfully cataloged!");
      setIsEditMode(true); // Now loaded logs match db entries
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to commit attendance calculations.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const classesForSelectedSubject = selectedAssignment ? selectedAssignment.classes : [];

  const counts = students.reduce((acc, curr) => {
    const stat = attendanceState[curr.id] || "present";
    if (stat === "present") acc.present++;
    else acc.absent++;
    return acc;
  }, { present: 0, absent: 0 });

  return (
    <div id="faculty-dashboard" className="min-h-screen flex flex-col bg-slate-50/50 font-sans">
      
      {/* Top Header Panel - Glossy Crisp Light SaaS layout */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">
                EduTrack<span className="text-emerald-600 font-extrabold">360</span>
              </h1>
              <p className="text-[10.5px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Faculty Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex px-2.5 py-1 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono border border-slate-200/80 font-bold">
              {facultyUser.name} • Faculty Core Account
            </span>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <button
              id="faculty-logout-btn"
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-900 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar switcher sub-header */}
      <div className="bg-white border-b border-slate-200/80 sticky top-[53px] z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex space-x-6">
            <button
              id="faculty-tab-att-btn"
              onClick={() => setActiveTab("attendance")}
              className={`py-3.5 px-1 border-b-2 font-semibold text-xs tracking-wider transition-all cursor-pointer ${
                activeTab === "attendance"
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-705 hover:border-slate-300"
              }`}
            >
              Mark Class Attendance
            </button>
            <button
              id="faculty-tab-dir-btn"
              onClick={() => {
                setActiveTab("directory");
                setDirectorySearchQuery("");
              }}
              className={`py-3.5 px-1 border-b-2 font-semibold text-xs tracking-wider transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-705 hover:border-slate-300"
              }`}
            >
              Student Directory
            </button>
            <button
              id="faculty-tab-prof-btn"
              onClick={() => {
                setActiveTab("profile");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
              }}
              className={`py-3.5 px-1 border-b-2 font-semibold text-xs tracking-wider transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-705 hover:border-slate-300"
              }`}
            >
              Security Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">

        {/* Live Toast Dialog - modern sleek bottom-right toast */}
        {toast && (
          <div id="faculty-toast-alert" className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-md border transition-all duration-300 ${
            toast.type === "success" 
              ? "bg-slate-900 border-emerald-500/20 text-emerald-400" 
              : "bg-slate-900 border-rose-500/20 text-rose-400"
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide uppercase font-mono">{toast.message}</span>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
            {/* Left Side Selection Widget */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
            <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Roster Select</span>
            </h3>

            {loading && assignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center animate-pulse">Loading assigned tracks...</p>
            ) : assignments.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-xs flex items-start gap-2 border border-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>No assigned subjects.</strong> You cannot mark attendance. Contact the system administrator to assign subjects.
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select Assigned Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject allocation</label>
                  <select
                    id="fac-assignment-select"
                    value={selectedAssignmentId}
                    onChange={(e) => {
                      setSelectedAssignmentId(e.target.value);
                      setSelectedClassId(""); // reset class
                    }}
                    className="w-full px-3 py-2 bg-snug-slate bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/5 transition-all font-medium"
                  >
                    <option value="">-- Choose Assigned Subject --</option>
                    {assignments.map(as => (
                      <option key={as.id} value={as.id}>
                        [{as.subjectCode}] {as.subjectName} ({as.courseName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Section classroom */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Class section</label>
                  <select
                    id="fac-class-select"
                    disabled={!selectedAssignmentId}
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-snug-slate bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/5 transition-all disabled:opacity-50 disabled:bg-slate-100 font-medium"
                  >
                    <option value="">-- Choose Section --</option>
                    {classesForSelectedSubject.map((cl: any) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Date Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Attendance Date</label>
                  <input
                    id="fac-date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-snug-slate bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/5 transition-all font-mono font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Guidelines Box */}
          <div className="bg-slate-950 rounded-xl p-4 text-white shadow-inner space-y-2">
            <h4 className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Marker Safeguards
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              All dates are locked to GMT-based academic years. Absent notifications will be sent automatically to the student profile immediately upon committing daily roster submissions.
            </p>
          </div>
        </div>

        {/* Central Attendance Workspace */}
        <div className="lg:col-span-3 space-y-6">

          {selectedAssignmentId && selectedClassId ? (
            <div id="attendance-roster-pane" className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-6 animate-fade-in animate-duration-300">
              
              {/* Header metrics card */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
                <div>
                  <h2 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
                    <span>Attendance Worksheet</span>
                    {isEditMode && (
                      <span id="edit-mode-indicator" className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 border border-amber-200 uppercase font-mono px-2 py-0.5 rounded font-bold">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Overwriting Saved Log
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Course Path: {selectedAssignment?.courseName} • Subject Code: <strong className="text-slate-600 font-mono">{selectedAssignment?.subjectCode}</strong>
                  </p>
                </div>

                {/* Quick actions Mark All */}
                <div className="flex items-center gap-2">
                  <button
                    id="mark-all-present-btn"
                    onClick={() => handleMarkAll("present")}
                    className="p-1.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200 text-emerald-800 font-medium text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Mark All Present
                  </button>
                  <button
                    id="mark-all-absent-btn"
                    onClick={() => handleMarkAll("absent")}
                    className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100/80 active:bg-rose-200 text-rose-800 font-medium text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {/* Roster student table */}
              <div className="space-y-4">
                {students.length === 0 ? (
                  <p id="no-students-cl-msg" className="text-xs text-slate-400 py-12 text-center animate-pulse">This class registry has no active students onboarded yet.</p>
                ) : (
                  <div className="border border-slate-200/60 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                    <div className="grid grid-cols-12 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500 tracking-wider font-display">
                      <div className="col-span-4">Roll Number</div>
                      <div className="col-span-5">Student Identity</div>
                      <div className="col-span-3 text-right">Attendance State</div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {students.map((student) => {
                        const state = attendanceState[student.id] || "present";
                        return (
                          <div 
                            key={student.id} 
                            id={`student-row-${student.id}`} 
                            className={`grid grid-cols-12 p-3.5 items-center text-xs transition-all ${
                              state === "absent" ? "bg-rose-50/10 hover:bg-rose-50/20" : "hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="col-span-4">
                              <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-bold border border-slate-200">{student.rollNumber}</span>
                            </div>
                            <div className="col-span-5">
                              <p className="font-semibold text-slate-800 text-sm">{student.name}</p>
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-1">
                              <button
                                id={`present-btn-${student.id}`}
                                onClick={() => handleStatusToggle(student.id, "present")}
                                className={`px-2.5 py-1 rounded-lg font-medium tracking-wide flex items-center gap-1 cursor-pointer transition-all ${
                                  state === "present"
                                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" /> Present
                              </button>
                              <button
                                id={`absent-btn-${student.id}`}
                                onClick={() => handleStatusToggle(student.id, "absent")}
                                className={`px-2.5 py-1 rounded-lg font-medium tracking-wide flex items-center gap-1 cursor-pointer transition-all ${
                                  state === "absent"
                                    ? "bg-rose-600 text-white shadow-sm font-semibold"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                <X className="w-3.5 h-3.5" /> Absent
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Roster details & Commit footer */}
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between border border-slate-150 gap-4 mt-6">
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Present: <strong className="text-slate-900 font-mono text-sm">{counts.present}</strong></span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Absent: <strong className="text-slate-900 font-mono text-sm">{counts.absent}</strong></span>
                  <span className="text-slate-400">|</span>
                  <span>Roster: <strong className="text-slate-900 font-mono text-sm">{students.length}</strong></span>
                </div>
                
                <button
                  id="submit-attendance-btn"
                  onClick={handleSaveAttendance}
                  disabled={loading || students.length === 0}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  {isEditMode ? "Overwrite attendance logs" : "Commit Attendance sheet"}
                </button>
              </div>

            </div>
          ) : (
            <div id="no-roster-select-pane" className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-12 text-center space-y-4 animate-pulse">
              <div className="p-4 bg-emerald-50 hover:bg-emerald-100/50 inline-flex rounded-full text-emerald-600 transition-all">
                <BookOpen className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-800 text-lg">Worksheet Draft Initialized</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                  Select a registered subject allocation and classroom section pathway on the left interface sidebar to commence recording daily attendance sheets.
                </p>
              </div>
            </div>
          )}

          </div>
          </div>
        )}

        {/* TAB 2: STUDENT DIRECTORY SEARCH */}
        {activeTab === "directory" && (
          <div id="faculty-student-directory" className="space-y-6 animate-fade-in bg-white rounded-xl shadow-sm border border-slate-200/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Student Directory</h2>
                <p className="text-xs text-slate-400 font-medium">Search matching student names, roll keys, and register records across university departments.</p>
              </div>
              <div id="dir-search-container" className="w-full md:w-80 relative">
                <input
                  id="directory-search-input"
                  type="text"
                  placeholder="Filter name, roll, reg, email..."
                  value={directorySearchQuery}
                  onChange={(e) => setDirectorySearchQuery(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-400"
                />
                {directorySearchQuery && (
                  <button
                    onClick={() => setDirectorySearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto font-sans">
              <table id="directory-students-table" className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 uppercase tracking-wider font-semibold">
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Register No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Course System</th>
                    <th className="p-3">Class/Section</th>
                    <th className="p-3">Registered Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(() => {
                    const filtered = allStudents.filter((std: any) => {
                      const q = directorySearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        std.name?.toLowerCase().includes(q) ||
                        std.rollNumber?.toLowerCase().includes(q) ||
                        std.registerNumber?.toLowerCase().includes(q) ||
                        (std.username || std.email || std.studentEmail || "")?.toLowerCase().includes(q)
                      );
                    });

                    // Sort ascending by Register Number (preferred) or Roll Number
                    const sorted = [...filtered].sort((a: any, b: any) => {
                      const aVal = a.registerNumber || a.rollNumber || "";
                      const bVal = b.registerNumber || b.rollNumber || "";
                      return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
                    });

                    if (sorted.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">No matching student profile results found.</td>
                        </tr>
                      );
                    }

                    return sorted.map((std: any) => (
                      <tr key={std.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 pb-2">
                        <td className="p-3 font-mono text-emerald-600 font-bold">{std.rollNumber || "N/A"}</td>
                        <td className="p-3 font-mono">{std.registerNumber || "N/A"}</td>
                        <td className="p-3 font-semibold text-slate-900">{std.name}</td>
                        <td className="p-3">{std.courseName || std.courseId || "Undergraduate Program"}</td>
                        <td className="p-3">{std.className || std.classId || "Standard Division"}</td>
                        <td className="p-3 text-slate-500 font-mono">{std.username || std.email || "N/A"}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MY PROFILE SETTINGS */}
        {activeTab === "profile" && (
          <div id="faculty-profile-panel" className="max-w-xl mx-auto space-y-6 animate-fade-in bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 mt-4">
            <div className="border-b border-slate-150 pb-3">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Security Credentials</h2>
              <p className="text-xs text-slate-400 font-medium">Protect and revise your active academic session gateway code key.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
                <input
                  id="faculty-current-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
                <input
                  id="faculty-new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 animate-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                <input
                  id="faculty-confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                id="faculty-password-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                {loading ? "Saving Credentials..." : "Change Portal Password"}
              </button>
            </form>
          </div>
        )}

      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 EduTrack360. All academic operations encrypted and archived securely. University ERP Platform.</p>
        </div>
      </footer>
    </div>
  );
}
