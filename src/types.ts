export type UserRole = "admin" | "faculty" | "student";

export interface User {
  id: string;
  username: string;
  password?: string; // Opt out in API responses where possible
  role: UserRole;
  name: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
}

export interface Class {
  id: string;
  name: string;
  courseId: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  courseId: string;
}

export interface Faculty {
  id: string;
  userId: string;
  name: string;
  email: string;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  rollNumber: string;
  courseId: string;
  classId: string;
}

export interface SubjectFaculty {
  id: string;
  subjectId: string;
  facultyId: string;
}

export interface AttendanceRecord {
  studentId: string;
  status: "present" | "absent";
}

export interface Attendance {
  id: string;
  classId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  records: AttendanceRecord[];
  markedByFacultyId: string;
  createdAt: string;
}

export interface RegistrationRequest {
  id: string;
  studentId: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  type: "leave" | "correction";
  date?: string; // date of leave or attendance correction
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string; // Could be a specific user ID or "all"
  recipientRole?: "all" | "admin" | "faculty" | "student";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
