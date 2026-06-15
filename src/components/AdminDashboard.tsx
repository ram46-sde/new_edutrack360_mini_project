import React, { useState, useEffect } from "react";
import { 
  BookOpen, Users, Calendar, Inbox, Plus, Trash2, CheckCircle2, XCircle, 
  Layers, LogOut, Award, ChevronRight, GraduationCap, Mail, FileText, Sparkles, Bell,
  Pencil
} from "lucide-react";
import { User, Course, Class, Subject, Faculty, Student, SubjectFaculty, RegistrationRequest, Notification } from "../types";

interface AdminDashboardProps {
  adminUser: User;
  onLogout: () => void;
}

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"courses" | "faculty" | "students" | "requests" | "profile">("courses");
  
  // Data vectors
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Form states - Course
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");

  // Form states - Class
  const [newClassName, setNewClassName] = useState("");
  const [newClassCourseId, setNewClassCourseId] = useState("");

  // Form states - Subject
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectCourseId, setNewSubjectCourseId] = useState("");

  // Form states - Faculty
  const [newFacName, setNewFacName] = useState("");
  const [newFacEmail, setNewFacEmail] = useState("");
  const [newFacUsername, setNewFacUsername] = useState("");
  const [newFacPassword, setNewFacPassword] = useState("");

  // Form states - Student
  const [newStudName, setNewStudName] = useState("");
  const [newStudRoll, setNewStudRoll] = useState("");
  const [newStudCourseId, setNewStudCourseId] = useState("");
  const [newStudClassId, setNewStudClassId] = useState("");
  const [newStudUsername, setNewStudUsername] = useState("");
  const [newStudPassword, setNewStudPassword] = useState("");

  // Form states - Subject assignment
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignFacultyId, setAssignFacultyId] = useState("");

  // UI state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom Confirmation Modal and Course editing States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseCode, setEditCourseCode] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // State queries and change-password states
  const [facultySearchQuery, setFacultySearchQuery] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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
          userId: adminUser.id,
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

  const fetchInitialData = async () => {
    try {
      const hd = { "x-admin-id": adminUser.id };
      
      const responses = await Promise.all([
        fetch("/api/courses").then(r => r.json()),
        fetch("/api/classes").then(r => r.json()),
        fetch("/api/subjects").then(r => r.json()),
        fetch("/api/faculty").then(r => r.json()),
        fetch("/api/students").then(r => r.json()),
        fetch("/api/subject-faculty").then(r => r.json()),
        fetch("/api/requests").then(r => r.json()),
        fetch(`/api/notifications?userId=${adminUser.id}&role=admin`).then(r => r.json())
      ]);

      setCourses(responses[0]);
      setClasses(responses[1]);
      setSubjects(responses[2]);
      setFaculty(responses[3]);
      setStudents(responses[4]);
      setAssignments(responses[5]);
      setRequests(responses[6]);
      setNotifications(responses[7]);
    } catch (err) {
      console.error("Failed to load administration data vectors", err);
      triggerToast("error", "Failed to retrieve directory records.");
    }
  };

  // 1. Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName || !newCourseCode) return;
    setLoading(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ name: newCourseName, code: newCourseCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCourses([...courses, data]);
      setNewCourseName("");
      setNewCourseCode("");
      triggerToast("success", `Course [${data.code}] successfully registered.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to create course.");
    } finally {
      setLoading(false);
    }
  };

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditCourseName(course.name);
    setEditCourseCode(course.code);
  };

  const handleEditCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editCourseName.trim() || !editCourseCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({
          name: editCourseName.trim(),
          code: editCourseCode.toUpperCase().trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCourses(courses.map(c => c.id === editingCourse.id ? data : c));
      setEditingCourse(null);
      setEditCourseName("");
      setEditCourseCode("");
      triggerToast("success", `Course [${data.code}] updated successfully.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to update course.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Retire Course",
      message: "Are you sure you want to retire this course directory? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/courses/${id}`, {
            method: "DELETE",
            headers: { "x-admin-id": adminUser.id }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setCourses(courses.filter(c => c.id !== id));
          triggerToast("success", "Course retired successfully.");
        } catch (err: any) {
          triggerToast("error", err.message || "Failed to delete course.");
        }
        setConfirmModal(null);
      }
    });
  };

  // 2. Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassCourseId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ name: newClassName, courseId: newClassCourseId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClasses([...classes, data]);
      setNewClassName("");
      triggerToast("success", `Class '${data.name}' registered successfully.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Class register failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Classroom Section",
      message: "Are you sure you want to remove this classroom section from the registrar?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/classes/${id}`, {
            method: "DELETE",
            headers: { "x-admin-id": adminUser.id }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setClasses(classes.filter(c => c.id !== id));
          triggerToast("success", "Class deleted.");
        } catch (err: any) {
          triggerToast("error", err.message || "Class removal failure.");
        }
        setConfirmModal(null);
      }
    });
  };

  // 3. Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName || !newSubjectCode || !newSubjectCourseId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ name: newSubjectName, code: newSubjectCode, courseId: newSubjectCourseId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSubjects([...subjects, data]);
      setNewSubjectName("");
      setNewSubjectCode("");
      triggerToast("success", `Subject [${data.code}] onboarded.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to create subject.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Subject Curriculum",
      message: "Are you sure you want to remove this academic subject curriculum?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/subjects/${id}`, {
            method: "DELETE",
            headers: { "x-admin-id": adminUser.id }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setSubjects(subjects.filter(s => s.id !== id));
          triggerToast("success", "Subject removed.");
        } catch (err: any) {
          triggerToast("error", err.message || "Deletion failed.");
        }
        setConfirmModal(null);
      }
    });
  };

  // 4. Create Faculty
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacName || !newFacEmail || !newFacUsername || !newFacPassword) return;
    setLoading(true);

    try {
      const res = await fetch("/api/faculty", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ name: newFacName, email: newFacEmail, username: newFacUsername, password: newFacPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFaculty([...faculty, data]);
      setNewFacName("");
      setNewFacEmail("");
      setNewFacUsername("");
      setNewFacPassword("");
      triggerToast("success", `Faculty account set up for Dr./Prof. ${data.name}.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Faculty registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Revoke Faculty Credentials",
      message: "Are you sure you want to revoke academic credentials for this faculty member?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/faculty/${id}`, {
            method: "DELETE",
            headers: { "x-admin-id": adminUser.id }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setFaculty(faculty.filter(f => f.id !== id));
          triggerToast("success", "Faculty profile deactivated.");
        } catch (err: any) {
          triggerToast("error", err.message || "Revocation failed.");
        }
        setConfirmModal(null);
      }
    });
  };

  // 5. Subject Assignment
  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSubjectId || !assignFacultyId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/subject-faculty", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ subjectId: assignSubjectId, facultyId: assignFacultyId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAssignments([...assignments, data]);
      setAssignSubjectId("");
      triggerToast("success", "Subject and faculty successfully assigned.");
    } catch (err: any) {
      triggerToast("error", err.message || "Subject assignment failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Revoke Subject Allocation",
      message: "Are you sure you want to revoke this specific subject allocation from the faculty member?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/subject-faculty/${id}`, {
            method: "DELETE",
            headers: { "x-admin-id": adminUser.id }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setAssignments(assignments.filter(a => a.id !== id));
          triggerToast("success", "Assignment retracted.");
        } catch (err: any) {
          triggerToast("error", err.message || "Retraction failure.");
        }
        setConfirmModal(null);
      }
    });
  };

  // 6. Create Student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudName || !newStudRoll || !newStudCourseId || !newStudClassId || !newStudUsername || !newStudPassword) return;
    setLoading(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({
          name: newStudName,
          rollNumber: newStudRoll,
          courseId: newStudCourseId,
          classId: newStudClassId,
          username: newStudUsername,
          password: newStudPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStudents([...students, data]);
      setNewStudName("");
      setNewStudRoll("");
      setNewStudUsername("");
      setNewStudPassword("");
      triggerToast("success", `Onboarded student ${data.name} [${data.rollNumber}].`);
    } catch (err: any) {
      triggerToast("error", err.message || "Student onboarding error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Student Profile",
      message: "Are you sure you want to expel or remove this student profile from the active registry?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/students/${id}`, {
            method: "DELETE",
            headers: { "x-admin-id": adminUser.id }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setStudents(students.filter(s => s.id !== id));
          triggerToast("success", "Student files expunged.");
        } catch (err: any) {
          triggerToast("error", err.message || "Student removal failed.");
        }
        setConfirmModal(null);
      }
    });
  };

  // 7. Request Action
  const handleRequestStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
      triggerToast("success", `Request state has been updated to ${status}.`);
    } catch (err: any) {
      triggerToast("error", err.message || "State change error.");
    }
  };

  // Filter classes by course selection dynamically in forms
  const filteredClassesForForms = classes.filter(c => c.courseId === newStudCourseId);

  return (
    <div id="admin-dashboard" className="min-h-screen flex flex-col bg-[#faf9ff] font-sans">
      {/* Top Professional Header Bar - Glossy Crisp Light SaaS layout */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.015)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 rounded-xl text-white shadow-sm">
              <BookOpen className="w-5 h-5 text-lavender-300" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                EduTrack<span className="text-lavender-500 font-extrabold">360</span>
              </h1>
              <p className="text-[10.5px] text-slate-400 font-mono font-semibold uppercase tracking-wider">ERP Core Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex px-2.5 py-1 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono border border-slate-200/80 font-bold">
              {adminUser.name} • System Administrator
            </span>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="px-4 py-2 bg-black hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-lavender-300" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Toast Alert Box - modern sleek bottom-right toast */}
        {toast && (
          <div id="admin-toast-alert" className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-md border transition-all duration-300 ${
            toast.type === "success" 
              ? "bg-slate-900 border-lavender-500/20 text-lavender-300" 
              : "bg-slate-900 border-rose-500/20 text-rose-400"
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-lavender-350 text-lavender-300 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide uppercase font-mono">{toast.message}</span>
          </div>
        )}

        {/* Sidebar Nav Panels */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgb(0,0,0,0.02)] border border-slate-200/80 p-3 space-y-1.5">
            <div className="px-3 py-1.5 border-b border-slate-100/50">
              <h3 className="font-display font-bold text-[11px] text-slate-400 uppercase tracking-widest">Workspace Core</h3>
            </div>
            <nav className="space-y-1">
              <button
                id="tab-courses-btn"
                onClick={() => setActiveTab("courses")}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === "courses" 
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15" 
                    : "text-slate-600 hover:bg-[#faf9ff] hover:text-[#8B5CF6]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Academic Registry</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "courses" ? "text-white translate-x-0.5" : "text-slate-400"}`} />
              </button>

              <button
                id="tab-faculty-btn"
                onClick={() => setActiveTab("faculty")}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === "faculty" 
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15" 
                    : "text-slate-600 hover:bg-[#faf9ff] hover:text-[#8B5CF6]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </span>
                  <span>Faculty Allocation</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "faculty" ? "text-white translate-x-0.5" : "text-slate-400"}`} />
              </button>

              <button
                id="tab-students-btn"
                onClick={() => setActiveTab("students")}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === "students" 
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15" 
                    : "text-slate-600 hover:bg-[#faf9ff] hover:text-[#8B5CF6]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Student Registry</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "students" ? "text-white translate-x-0.5" : "text-slate-400"}`} />
              </button>

              <button
                id="tab-requests-btn"
                onClick={() => setActiveTab("requests")}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center justify-between relative cursor-pointer ${
                  activeTab === "requests" 
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15" 
                    : "text-slate-600 hover:bg-[#faf9ff] hover:text-[#8B5CF6]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 shrink-0" />
                  <span>Student Requests</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {requests.filter(r => r.status === "pending").length > 0 && (
                    <span id="pending-requests-count" className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${activeTab === "requests" ? "bg-white text-rose-500" : "bg-rose-500 text-white"}`}>
                      {requests.filter(r => r.status === "pending").length}
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "requests" ? "text-white translate-x-0.5" : "text-slate-400"}`} />
                </div>
              </button>

              <button
                id="tab-profile-btn"
                onClick={() => {
                  setActiveTab("profile");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === "profile" 
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/15" 
                    : "text-slate-600 hover:bg-[#faf9ff] hover:text-[#8B5CF6]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>Security & Profile</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "profile" ? "text-white translate-x-0.5" : "text-slate-400"}`} />
              </button>
            </nav>
          </div>

          {/* Quick Metrics */}
          <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgb(0,0,0,0.02)] border border-slate-200/80 space-y-3">
            <h4 className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lavender-500" /> Platform Statistics
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                <p className="text-xl font-extrabold text-slate-905 font-display text-slate-900">{courses.length}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Courses</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                <p className="text-xl font-extrabold text-slate-905 font-display text-slate-900">{faculty.length}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Faculties</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                <p className="text-xl font-extrabold text-slate-905 font-display text-slate-900">{students.length}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Students</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                <p className="text-xl font-extrabold text-slate-905 font-display text-slate-900">{classes.length}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Classrooms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Modules Canvas */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: ACADEMIC REGISTRY */}
          {activeTab === "courses" && (
            <div id="panel-courses" className="space-y-6 animate-fade-in">
              
              {/* Grid course allocation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Courses creation Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-sm border-slate-100 pb-3">
                    <Layers className="w-5 h-5 text-lavender-650 text-lavender-500" />
                    <h2 className="font-display font-semibold text-slate-800 text-md">Register New Course</h2>
                  </div>
                  <form onSubmit={handleCreateCourse} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Course Code</label>
                    <input 
                      id="course-code-input"
                      type="text" 
                      required 
                      placeholder="e.g. BTECH-CSE" 
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                    />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Course Name</label>
                    <input 
                      id="course-name-input"
                      type="text" 
                      required 
                      placeholder="e.g. Bachelor of Computer Science" 
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                    />
                    </div>
                    <button 
                      id="course-submit-btn"
                      type="submit" 
                      disabled={loading}
                      className="w-full py-2.5 bg-black hover:bg-slate-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                    >
                      <Plus className="w-4 h-4" /> Setup Course
                    </button>
                  </form>
                </div>

                {/* Course List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 border-b border-slate-100 pb-3 text-sm uppercase tracking-wider flex items-center justify-between">
                      <span>Course Directory</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{courses.length} listed</span>
                    </h3>
                    <div className="mt-3 divide-y divide-slate-100 max-h-50 overflow-y-auto">
                      {courses.length === 0 ? (
                        <p id="no-courses-msg" className="text-xs font-medium text-slate-400 py-6 text-center">No catalog courses registered yet.</p>
                      ) : (
                        courses.map(course => (
                          <div key={course.id} className="py-2.5 flex items-center justify-between text-xs font-medium text-slate-700">
                            <div className="flex-1 truncate pr-2">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600 mr-2 uppercase shrink-0">{course.code}</span>
                              <span className="truncate">{course.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => startEditCourse(course)}
                                className="text-slate-400 hover:text-lavender-500 active:scale-95 transition-all cursor-pointer p-1"
                                title="Edit Course"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCourse(course.id)}
                                className="text-slate-400 hover:text-rose-500 active:scale-95 transition-all cursor-pointer p-1"
                                title="Retire Course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid classes & subjects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Classroom setup card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-display font-semibold text-slate-800 text-md">Create Class Section</h2>
                  </div>
                  <form onSubmit={handleCreateClass} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Select Course Pathway</label>
                      <select 
                        id="class-course-select"
                        required
                        value={newClassCourseId}
                        onChange={(e) => setNewClassCourseId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-lavender-500"
                      >
                        <option value="">-- Choose Course Path --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Classroom / Section Name</label>
                      <input 
                        id="class-name-input"
                        type="text" 
                        required 
                        placeholder="e.g. CSE-2026-A" 
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-lavender-500"
                      />
                    </div>
                    <button 
                      id="class-submit-btn"
                      type="submit" 
                      disabled={loading}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-white font-medium rounded-lg text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Instantiate Classroom
                    </button>
                  </form>
                  
                  {/* Class list summaries */}
                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2 font-display">Active Classroom Sections</h4>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                      {classes.length === 0 ? (
                        <p id="no-classes-msg" className="text-[11px] text-slate-400 py-2 text-center">No course classrooms recorded.</p>
                      ) : (
                        classes.map(cl => {
                          const course = courses.find(c => c.id === cl.courseId) || { code: "N/A" };
                          return (
                            <div key={cl.id} className="py-2 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-slate-400 font-mono text-[10px] mr-1">[{course.code}]</span>
                                <span className="font-medium text-slate-700">{cl.name}</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteClass(cl.id)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Directory allocation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h2 className="font-display font-semibold text-slate-800 text-md">Register Subject Curriculum</h2>
                  </div>
                  <form onSubmit={handleCreateSubject} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Subject code</label>
                        <input 
                          id="subject-code-input"
                          type="text" 
                          required 
                          placeholder="e.g. CS-101" 
                          value={newSubjectCode}
                          onChange={(e) => setNewSubjectCode(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-lavender-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Subject Name</label>
                        <input 
                          id="subject-name-input"
                          type="text" 
                          required 
                          placeholder="e.g. Data Structures" 
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-lavender-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Belongs Course Curriculum</label>
                      <select 
                        id="subject-course-select"
                        required
                        value={newSubjectCourseId}
                        onChange={(e) => setNewSubjectCourseId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-lavender-500"
                      >
                        <option value="">-- Select Course --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      id="subject-submit-btn"
                      type="submit" 
                      disabled={loading}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-medium rounded-lg text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Instantiate Subject
                    </button>
                  </form>

                  {/* Subject listing */}
                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2 font-display">Configured Subjects</h4>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                      {subjects.length === 0 ? (
                        <p id="no-subjects-msg" className="text-[11px] text-slate-400 py-2 text-center">No curriculum subjects archived.</p>
                      ) : (
                        subjects.map(sj => {
                          const course = courses.find(c => c.id === sj.courseId) || { code: "N/A" };
                          return (
                            <div key={sj.id} className="py-2 flex items-center justify-between text-xs">
                              <div>
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono font-semibold text-slate-500 uppercase mr-1">{sj.code}</span>
                                <span className="font-medium text-slate-700">{sj.name}</span>
                                <span className="text-slate-400 text-[10px] ml-1">({course.code})</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteSubject(sj.id)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: FACULTY ALLOCATION */}
          {activeTab === "faculty" && (
            <div id="panel-faculty" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Onboard Faculty Credentials Form */}
                <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Users className="w-5 h-5 text-lavender-550 text-lavender-500" />
                    <h2 className="font-display font-semibold text-slate-800 text-md">Onboard Faculty</h2>
                  </div>
                  <form onSubmit={handleCreateFaculty} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                      <input 
                        id="fac-name-input"
                        type="text" 
                        required 
                        placeholder="e.g. Dr. Ada Lovelace" 
                        value={newFacName}
                        onChange={(e) => setNewFacName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email ID</label>
                      <input 
                        id="fac-email-input"
                        type="email" 
                        required 
                        placeholder="e.g. ada@university.edu" 
                        value={newFacEmail}
                        onChange={(e) => setNewFacEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Sign-in Username</label>
                      <input 
                        id="fac-username-input"
                        type="text" 
                        required 
                        placeholder="e.g. adalovelace" 
                        value={newFacUsername}
                        onChange={(e) => setNewFacUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Portal Password</label>
                      <input 
                        id="fac-password-input"
                        type="password" 
                        required 
                        placeholder="• • • • • • • •" 
                        value={newFacPassword}
                        onChange={(e) => setNewFacPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                      />
                    </div>
                    <button 
                      id="fac-submit-btn"
                      type="submit" 
                      disabled={loading}
                      className="w-full py-2.5 bg-black hover:bg-slate-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                    >
                      <Plus className="w-4 h-4" /> Save Profile
                    </button>
                  </form>
                </div>

                {/* Faculty Profiles List */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                        <span>Onboarded Faculties</span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{faculty.length} listed</span>
                      </h3>
                    </div>
                    <div className="mt-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {faculty.length === 0 ? (
                        <p id="no-faculty-msg" className="text-xs font-medium text-slate-400 py-10 text-center">No faculty profiles onboarded yet.</p>
                      ) : (
                        faculty.map(fac => (
                          <div key={fac.id} className="py-3 flex items-center justify-between text-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-800">{fac.name}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-slate-400">
                                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {fac.email}</span>
                                <span className="hidden sm:inline text-slate-300">•</span>
                                <span className="font-mono text-[10px] text-slate-500">Username: {fac.username}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteFaculty(fac.id)}
                              className="p-1 px-2.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all cursor-pointer"
                              title="Retire Faculty"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Subject to Faculty Assignment Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Allocator Form */}
                <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h2 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider">Allocate Subject</h2>
                  </div>
                  <form onSubmit={handleAssignSubject} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Select Subject</label>
                      <select 
                        id="assign-subject-select"
                        required
                        value={assignSubjectId}
                        onChange={(e) => setAssignSubjectId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-lavender-500"
                      >
                        <option value="">-- Choose Subject --</option>
                        {subjects.map(s => {
                          const crs = courses.find(c => c.id === s.courseId) || { code: "N/A" };
                          return (
                            <option key={s.id} value={s.id}>[{s.code}] {s.name} ({crs.code})</option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Assign to Teacher/Faculty</label>
                      <select 
                        id="assign-faculty-select"
                        required
                        value={assignFacultyId}
                        onChange={(e) => setAssignFacultyId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-lavender-500"
                      >
                        <option value="">-- Choose Faculty --</option>
                        {faculty.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      id="assign-submit-btn"
                      type="submit" 
                      disabled={loading}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-medium rounded-lg text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Allocate Assignment
                    </button>
                  </form>
                </div>

                {/* Assignment active mapping registry */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                    <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider">
                      Assigned Faculties Catalog
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase font-mono">
                      {assignments.length} total
                    </span>
                  </div>

                  {/* Dynamic Faculty Allocation Search Bar */}
                  <div className="mt-3 mb-2">
                    <input
                       id="faculty-allocation-search"
                       type="text"
                       placeholder="Search faculty name, ID, email, or subject..."
                       value={facultySearchQuery}
                       onChange={(e) => setFacultySearchQuery(e.target.value)}
                       className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-lavender-500 font-medium placeholder-slate-400 font-sans"
                    />
                  </div>

                  <div className="mt-3 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {assignments.length === 0 ? (
                      <p id="no-assignments-msg" className="text-xs font-medium text-slate-400 py-8 text-center animate-pulse">No curriculum mappings assigned yet.</p>
                    ) : assignments.filter((as: any) => {
                      const q = facultySearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      const facRec = faculty.find(f => f.id === as.facultyId) || {};
                      return (
                        as.facultyName?.toLowerCase().includes(q) ||
                        as.facultyId?.toLowerCase().includes(q) ||
                        facRec.email?.toLowerCase().includes(q) ||
                        as.subjectName?.toLowerCase().includes(q) ||
                        as.subjectCode?.toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                      <p className="text-xs font-medium text-slate-400 py-8 text-center">No allocated subjects match your query terms.</p>
                    ) : (
                      assignments.filter((as: any) => {
                        const q = facultySearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        const facRec = faculty.find(f => f.id === as.facultyId) || {};
                        return (
                          as.facultyName?.toLowerCase().includes(q) ||
                          as.facultyId?.toLowerCase().includes(q) ||
                          facRec.email?.toLowerCase().includes(q) ||
                          as.subjectName?.toLowerCase().includes(q) ||
                          as.subjectCode?.toLowerCase().includes(q)
                        );
                      }).map(as => (
                        <div key={as.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{as.facultyName}</span>
                            <span className="text-slate-400 mx-2">allocated to teach</span>
                            <span className="px-1.5 py-0.5 bg-lavender-50 border border-lavender-200 text-lavender-800 font-medium rounded text-[10px] uppercase font-mono mr-1">
                              {as.subjectCode}
                            </span>
                            <span className="text-slate-600 font-medium font-sans">{as.subjectName}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteAssignment(as.id)}
                            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded cursor-pointer"
                            title="Retract Allocation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: STUDENT REGISTRY */}
          {activeTab === "students" && (
            <div id="panel-students" className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              
              {/* Register student files */}
              <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <GraduationCap className="w-5 h-5 text-lavender-550 text-lavender-500" />
                  <h2 className="font-display font-semibold text-slate-800 text-md">Onboard Student</h2>
                </div>
                <form onSubmit={handleCreateStudent} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Roll Number</label>
                    <input 
                      id="stud-roll-input"
                      type="text" 
                      required 
                      placeholder="e.g. ROLL-2026-0043" 
                      value={newStudRoll}
                      onChange={(e) => setNewStudRoll(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-lavender-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                    <input 
                      id="stud-name-input"
                      type="text" 
                      required 
                      placeholder="e.g. Alan Turing" 
                      value={newStudName}
                      onChange={(e) => setNewStudName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Select Course</label>
                      <select 
                        id="stud-course-select"
                        required
                        value={newStudCourseId}
                        onChange={(e) => {
                          setNewStudCourseId(e.target.value);
                          setNewStudClassId(""); // reset section
                        }}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-lavender-500"
                      >
                        <option value="">-- Path --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Select Class</label>
                      <select 
                        id="stud-class-select"
                        required
                        disabled={!newStudCourseId}
                        value={newStudClassId}
                        onChange={(e) => setNewStudClassId(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-lavender-500 disabled:opacity-50"
                      >
                        <option value="">-- Class --</option>
                        {filteredClassesForForms.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Portal Sign-in username</label>
                      <input 
                        id="stud-username-input"
                        type="text" 
                        required 
                        placeholder="e.g. alanturing" 
                        value={newStudUsername}
                        onChange={(e) => setNewStudUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Create Password</label>
                      <input 
                        id="stud-password-input"
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={newStudPassword}
                        onChange={(e) => setNewStudPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-lavender-500 focus:ring-4 focus:ring-lavender-500/5 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <button 
                    id="stud-submit-btn"
                    type="submit" 
                    disabled={loading}
                    className="w-full py-2.5 bg-black hover:bg-slate-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                  >
                    <Plus className="w-4 h-4" /> Save Student
                  </button>
                </form>
              </div>

              {/* Student files registry list */}
              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <span>Registered Student Directory</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{students.length} students</span>
                    </h3>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100 max-h-120 overflow-y-auto">
                    {students.length === 0 ? (
                      <p id="no-students-msg" className="text-xs font-medium text-slate-400 py-16 text-center">No student files onboarded. Setup courses and classes first.</p>
                    ) : (
                      students.map(std => (
                        <div key={std.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-900 text-slate-100 font-mono text-[9px] font-bold rounded uppercase">{std.rollNumber}</span>
                              <span className="font-semibold text-slate-800 text-sm">{std.name}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-slate-400 font-medium">
                              <span>Course: <strong className="text-slate-600">{std.courseName} ({std.courseCode})</strong></span>
                              <span className="hidden sm:inline text-slate-300">•</span>
                              <span>Classroom: <strong className="text-slate-600">{std.className}</strong></span>
                              <span className="hidden sm:inline text-slate-300">•</span>
                              <span>Username: <strong className="text-slate-600">{std.username}</strong></span>
                            </div>
                          </div>
                          <div>
                            <button 
                              onClick={() => handleDeleteStudent(std.id)}
                              className="text-slate-400 hover:text-rose-500 p-1 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="Delete Student Registry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: STUDENTS REQUESTS LOGS */}
          {activeTab === "requests" && (
            <div id="panel-requests" className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4 animate-fade-in animate-duration-300">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>Student Administrative Leaves & Correction Requests</span>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{requests.length} total</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100 max-h-120 overflow-y-auto">
                {requests.length === 0 ? (
                  <p id="no-requests-msg" className="text-xs font-medium text-slate-400 py-16 text-center">No student administrative files submitted.</p>
                ) : (
                  requests.map(req => (
                    <div key={req.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs font-sans">
                      <div className="space-y-1 md:max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 font-bold font-mono text-[9px] uppercase rounded ${
                            req.type === "leave" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {req.type} request
                          </span>
                          <span className="font-semibold text-slate-800 text-sm">{req.title}</span>
                          <span className="text-slate-400 font-medium">• Submitted by {req.studentName} ({req.studentRollNumber}) • {req.className}</span>
                        </div>
                        <p className="text-slate-600 font-medium bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed">{req.description}</p>
                        <div className="text-[10px] text-slate-400 font-medium pt-1 flex items-center gap-2">
                          {req.date && <span>Target Date: <strong className="text-slate-600">{req.date}</strong></span>}
                          <span>• Filed on {new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Status indicator / Decision buttons */}
                      <div className="flex items-center gap-2 md:self-center shrink-0">
                        {req.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`approve-btn-${req.id}`}
                              onClick={() => handleRequestStatus(req.id, "approved")}
                              className="px-3 py-1.5 bg-lavender-600 hover:bg-lavender-500 active:bg-lavender-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              id={`reject-btn-${req.id}`}
                              onClick={() => handleRequestStatus(req.id, "rejected")}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            req.status === "approved" 
                              ? "bg-lavender-100 text-lavender-800 border border-lavender-200" 
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div id="admin-profile-panel" className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 animate-fade-in space-y-6 self-start">
              <div className="border-b border-slate-150 pb-3">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Security Credentials Profile</h2>
                <p className="text-xs text-slate-400 font-medium">Protect and update your core administrator access code.</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
                  <input
                    id="admin-current-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-250 rounded-lg text-sm focus:outline-none focus:border-lavender-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    id="admin-new-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-250 rounded-lg text-sm focus:outline-none focus:border-lavender-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    id="admin-confirm-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-250 rounded-lg text-sm focus:outline-none focus:border-lavender-500 font-medium"
                  />
                </div>

                <button
                  id="admin-password-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer font-semibold"
                >
                  {loading ? "Changing Credentials..." : "Update Security Code"}
                </button>
              </form>
            </div>
          )}

        </div>

      </main>
      
      {/* CUSTOM CONFIRMATION OVERLAY MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-md">{confirmModal.title}</h3>
            <p className="text-slate-500 text-xs text-slate-400 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COURSE OVERLAY MODAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Pencil className="w-5 h-5 text-lavender-550 text-lavender-500" />
              <h3 className="font-display font-bold text-slate-800 text-md">Modify Course Curriculum</h3>
            </div>
            <form onSubmit={handleEditCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  value={editCourseCode}
                  onChange={(e) => setEditCourseCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs uppercase focus:outline-none focus:border-lavender-500 bg-white"
                  placeholder="e.g. CS-201"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-lavender-500 bg-white"
                  placeholder="e.g. Software Engineering"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-lavender-650 bg-lavender-600 hover:bg-lavender-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Footer bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 EduTrack360. All academic operations encrypted and archived securely. University ERP Platform.</p>
        </div>
      </footer>
    </div>
  );
}
