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
    <div id="faculty-dashboard" className="min-h-screen flex flex-col bg-[#faf9ff] font-sans">
      
      {/* Top Header Panel - Glossy Crisp Light SaaS layout */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.015)]">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 rounded-xl text-white shadow-sm">
              <Award className="w-5 h-5 text-lavender-300" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                EduTrack<span className="text-lavender-500 font-extrabold">360</span>
              </h1>
              <p className="text-[9.5px] text-slate-400 font-mono font-bold uppercase tracking-wider">Faculty Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex px-3 py-1 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono border border-slate-200/50 font-bold">
              {facultyUser.name} • Faculty Account
            </span>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <button
              id="faculty-logout-btn"
              onClick={onLogout}
              className="px-4 py-2 bg-black hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <LogOut className="w-3.5 h-3.5 text-lavender-300" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar switcher sub-header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-[57px] z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex space-x-6">
            <button
              id="faculty-tab-att-btn"
              onClick={() => setActiveTab("attendance")}
              className={`py-4 px-1 border-b-2 font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === "attendance"
                  ? "border-lavender-500 text-lavender-650 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-950 hover:border-slate-300"
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
              className={`py-4 px-1 border-b-2 font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "border-lavender-500 text-lavender-650 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-950 hover:border-slate-300"
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
              className={`py-4 px-1 border-b-2 font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "border-lavender-500 text-lavender-650 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-950 hover:border-slate-300"
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
              ? "bg-slate-900 border-lavender-500/20 text-lavender-300" 
              : "bg-slate-900 border-rose-500/20 text-rose-400"
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-lavender-300 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide uppercase font-mono">{toast.message}</span>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
            {/* Left Side Selection Widget */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-slate-200/60 p-5 space-y-4">
                <h3 className="font-display font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-lavender-500" />
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
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subject allocation</label>
                      <select
                        id="fac-assignment-select"
                        value={selectedAssignmentId}
                        onChange={(e) => {
                          setSelectedAssignmentId(e.target.value);
                          setSelectedClassId(""); // reset class
                        }}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium text-slate-705 cursor-pointer"
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
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Active Class section</label>
                      <select
                        id="fac-class-select"
                        disabled={!selectedAssignmentId}
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all disabled:opacity-50 disabled:bg-slate-100 font-medium text-slate-705 cursor-pointer"
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
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attendance Date</label>
                      <input
                        id="fac-date-select"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Guidelines Box */}
              <div className="bg-slate-950 rounded-2xl p-5 text-white shadow-inner space-y-2">
                <h4 className="text-[10px] font-mono text-lavender-300 tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Marker Safeguards
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-medium">
                  All dates are locked to GMT-based academic years. Absent notifications will be sent automatically to the student profile immediately upon committing daily roster submissions.
                </p>
              </div>
            </div>

            {/* Central Attendance Workspace */}
            <div className="lg:col-span-3 space-y-6">

              {selectedAssignmentId && selectedClassId ? (
                <div id="attendance-roster-pane" className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-slate-200/60 p-5 space-y-6 animate-fade-in animate-duration-300">
                  
                  {/* Header metrics card */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
                    <div>
                      <h2 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
                        <span>Attendance Worksheet</span>
                        {isEditMode && (
                          <span id="edit-mode-indicator" className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200/80 uppercase font-mono px-2.5 py-1 rounded-lg font-bold">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Overwriting Saved Log
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium font-sans mt-0.5">
                        Course Path: {selectedAssignment?.courseName} • Subject Code: <strong className="text-slate-600 font-mono">{selectedAssignment?.subjectCode}</strong>
                      </p>
                    </div>

                    {/* Quick actions Mark All */}
                    <div className="flex items-center gap-2">
                      <button
                        id="mark-all-present-btn"
                        onClick={() => handleMarkAll("present")}
                        className="py-1.5 px-3 bg-lavender-50 hover:bg-lavender-100 text-lavender-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Mark All Present
                      </button>
                      <button
                        id="mark-all-absent-btn"
                        onClick={() => handleMarkAll("absent")}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Mark All Absent
                      </button>
                    </div>
                  </div>

                  {/* Roster student table */}
                  <div className="space-y-4">
                    {students.length === 0 ? (
                      <p id="no-students-cl-msg" className="text-xs text-slate-400 py-12 text-center animate-pulse font-medium">This class registry has no active students onboarded yet.</p>
                    ) : (
                      <div className="border border-slate-200/50 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                        <div className="grid grid-cols-12 bg-slate-50 p-3.5 text-xs font-bold uppercase text-slate-550 tracking-wider font-mono">
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
                                className={`grid grid-cols-12 px-4 py-3.5 items-center text-xs transition-all ${
                                  state === "absent" ? "bg-rose-50/10 hover:bg-rose-50/20" : "hover:bg-slate-50/50"
                                }`}
                              >
                                <div className="col-span-4">
                                  <span className="font-mono text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg font-bold border border-slate-250/50">{student.rollNumber}</span>
                                </div>
                                <div className="col-span-5">
                                  <p className="font-extrabold text-slate-900 text-sm">{student.name}</p>
                                </div>
                                <div className="col-span-3 flex items-center justify-end gap-1.5">
                                  <button
                                    id={`present-btn-${student.id}`}
                                    onClick={() => handleStatusToggle(student.id, "present")}
                                    className={`px-3 py-1.5 rounded-xl font-bold tracking-wide flex items-center gap-1 cursor-pointer transition-all text-[11px] ${
                                      state === "present"
                                        ? "bg-[#8B5CF6] text-white shadow-sm"
                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" /> Present
                                  </button>
                                  <button
                                    id={`absent-btn-${student.id}`}
                                    onClick={() => handleStatusToggle(student.id, "absent")}
                                    className={`px-3 py-1.5 rounded-xl font-bold tracking-wide flex items-center gap-1 cursor-pointer transition-all text-[11px] ${
                                      state === "absent"
                                        ? "bg-rose-600 text-white shadow-sm"
                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
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
                  <div className="bg-[#faf9ff] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between border border-slate-200/60 gap-4 mt-6">
                    <div className="text-xs font-semibold text-slate-650 flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lavender-500 inline-block"></span> Present: <strong className="text-slate-900 font-mono text-sm">{counts.present}</strong></span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Absent: <strong className="text-slate-900 font-mono text-sm">{counts.absent}</strong></span>
                      <span className="text-slate-350">|</span>
                      <span>Total Registered: <strong className="text-slate-900 font-mono text-sm">{students.length}</strong></span>
                    </div>
                    
                    <button
                      id="submit-attendance-btn"
                      onClick={handleSaveAttendance}
                      disabled={loading || students.length === 0}
                      className="px-6 py-3 bg-black hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-lavender-300" />
                      {isEditMode ? "Overwrite attendance logs" : "Commit Attendance sheet"}
                    </button>
                  </div>

                </div>
              ) : (
                <div id="no-roster-select-pane" className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-slate-200/60 p-16 text-center space-y-4">
                  <div className="p-4 bg-lavender-50 inline-flex rounded-full text-lavender-600 transition-all">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base">Worksheet Draft Initialized</h3>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1.5 leading-relaxed font-semibold">
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
          <div id="faculty-student-directory" className="space-y-6 animate-fade-in bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-slate-200/60 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Student Directory</h2>
                <p className="text-xs text-slate-400 font-medium">Search matching student names, roll keys, and register records across university departments.</p>
              </div>
              <div id="dir-search-container" className="w-full md:w-80 relative">
                <input
                  id="directory-search-input"
                  type="text"
                  placeholder="Filter name, roll, reg, email..."
                  value={directorySearchQuery}
                  onChange={(e) => setDirectorySearchQuery(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-slate-200/80 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-lavender-500 font-medium placeholder-slate-400"
                />
                {directorySearchQuery && (
                  <button
                    onClick={() => setDirectorySearchQuery("")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto font-sans">
              <table id="directory-students-table" className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Roll No</th>
                    <th className="p-3.5">Register No</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Course System</th>
                    <th className="p-3.5">Class/Section</th>
                    <th className="p-3.5">Registered Contact</th>
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

                    const sorted = [...filtered].sort((a: any, b: any) => {
                      const aVal = a.registerNumber || a.rollNumber || "";
                      const bVal = b.registerNumber || b.rollNumber || "";
                      return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
                    });

                    if (sorted.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No matching student profile results found.</td>
                        </tr>
                      );
                    }

                    return sorted.map((std: any) => (
                      <tr key={std.id} className="hover:bg-[#faf9ff] transition-colors border-b border-slate-100 pb-2">
                        <td className="p-3.5 font-mono text-lavender-600 font-bold">{std.rollNumber || "N/A"}</td>
                        <td className="p-3.5 font-mono">{std.registerNumber || "N/A"}</td>
                        <td className="p-3.5 font-bold text-slate-900">{std.name}</td>
                        <td className="p-3.5 text-slate-650">{std.courseName || std.courseId || "Undergraduate Program"}</td>
                        <td className="p-3.5 text-slate-650">{std.className || std.classId || "Standard Division"}</td>
                        <td className="p-3.5 text-slate-400 font-mono">{std.username || std.email || "N/A"}</td>
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
          <div id="faculty-profile-panel" className="max-w-xl mx-auto space-y-6 animate-fade-in bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-slate-200/60 p-6 mt-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Security Credentials</h2>
              <p className="text-xs text-slate-400 font-medium">Protect and revise your active academic session gateway code key.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
                <input
                  id="faculty-current-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200/80 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  id="faculty-new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200/80 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  id="faculty-confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200/80 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 font-medium"
                />
              </div>

              <button
                id="faculty-password-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-black hover:bg-slate-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-98"
              >
                {loading ? "Saving Credentials..." : "Change Portal Password"}
              </button>
            </form>
          </div>
        )}

      </main>

      <footer className="bg-slate-950 border-t border-slate-800 py-8 text-center text-xs text-slate-500 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 EduTrack360. All academic operations encrypted and archived securely. University ERP Platform Operations.</p>
        </div>
      </footer>
    </div>
  );
}
