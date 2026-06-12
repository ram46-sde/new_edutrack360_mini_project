import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

// Middleware to parse JSON bodies
app.use(express.json());

// Helper function to read database files safely
function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Database read error, initializing draft database", error);
    return {
      users: [],
      courses: [],
      classes: [],
      subjects: [],
      faculty: [],
      students: [],
      subject_faculty: [],
      attendance: [],
      requests: [],
      notifications: []
    };
  }
}

// Helper function to write to database
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Database write error", error);
  }
}

// Helper to generate IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// ================= AUTHENTICATION ENDPOINTS =================

// Check state to see if any user exists (to manage Initial Setup screen)
app.get("/api/auth/init-status", (req, res) => {
  const db = readDb();
  const hasAdmin = db.users.some((u: any) => u.role === "admin");
  res.json({ needsAdminSetup: !hasAdmin });
});

// Create initial Administrator account
app.post("/api/auth/register-admin", (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db = readDb();
  const hasAdmin = db.users.some((u: any) => u.role === "admin");
  if (hasAdmin) {
    return res.status(400).json({ error: "Administrator account already exists" });
  }

  const userId = "usr-" + generateId();
  const newAdmin = {
    id: userId,
    name,
    username: username.toLowerCase().trim(),
    password,
    role: "admin"
  };

  db.users.push(newAdmin);
  writeDb(db);

  // Send a system notification for audit
  const notificationId = "ntf-" + generateId();
  db.notifications.push({
    id: notificationId,
    recipientId: userId,
    recipientRole: "admin",
    title: "System Initialized",
    message: `System admin account successfully set up for ${name}.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeDb(db);

  res.json({
    success: true,
    user: { id: userId, name: newAdmin.name, username: newAdmin.username, role: newAdmin.role }
  });
});

// Logs in any user role and verifies credentials
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const db = readDb();
  const lowerUsername = username.toLowerCase().trim();
  const user = db.users.find((u: any) => u.username === lowerUsername && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Find supplementary record if student or faculty
  let profile = null;
  if (user.role === "faculty") {
    profile = db.faculty.find((f: any) => f.userId === user.id) || null;
  } else if (user.role === "student") {
    profile = db.students.find((s: any) => s.userId === user.id) || null;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      profile
    }
  });
});

// Verify username or email and match with selected role for recovery
app.post("/api/auth/verify-user", (req, res) => {
  const { usernameOrEmail, role } = req.body;
  if (!usernameOrEmail || !role) {
    return res.status(400).json({ error: "Username/Email and Role selection are required." });
  }

  const db = readDb();
  const cleanInput = usernameOrEmail.toLowerCase().trim();

  // Find user based on direct match in db.users
  let user = db.users.find((u: any) => u.username === cleanInput && u.role === role);

  // If role is faculty and we haven't matched yet, look up in db.faculty by email
  if (!user && role === "faculty") {
    const fac = db.faculty.find((f: any) => f.email.toLowerCase().trim() === cleanInput);
    if (fac) {
      user = db.users.find((u: any) => u.id === fac.userId && u.role === "faculty");
    }
  }

  if (!user) {
    return res.status(404).json({ error: "No matching account was found with specified role ownership." });
  }

  res.json({
    success: true,
    userId: user.id,
    name: user.name
  });
});

// Save recovery reset password
app.post("/api/auth/reset-password", (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User verification and new password are required." });
  }

  // Minimum password requirements validation
  const cleanPassword = newPassword;
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }
  const hasLetter = /[a-zA-Z]/.test(cleanPassword);
  const hasNumber = /[0-9]/.test(cleanPassword);
  if (!hasLetter || !hasNumber) {
    return res.status(400).json({ error: "Password must contain both letters and numbers." });
  }

  const db = readDb();
  const userIndex = db.users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User account not found." });
  }

  db.users[userIndex].password = cleanPassword;
  writeDb(db);

  res.json({ success: true, message: "Password has been successfully recovered and reset." });
});

// Change Password for an active logged in session
app.post("/api/auth/change-password", (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "All password fields are required." });
  }

  const db = readDb();
  const userIndex = db.users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User account not found." });
  }

  const user = db.users[userIndex];
  if (user.password !== currentPassword) {
    return res.status(400).json({ error: "Current password does not match system logs." });
  }

  // Minimum password requirements validation
  const cleanPassword = newPassword;
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }
  const hasLetter = /[a-zA-Z]/.test(cleanPassword);
  const hasNumber = /[0-9]/.test(cleanPassword);
  if (!hasLetter || !hasNumber) {
    return res.status(400).json({ error: "New password must contain both letters and numbers." });
  }

  db.users[userIndex].password = cleanPassword;
  writeDb(db);

  res.json({ success: true, message: "Your portal password was successfully updated." });
});

// ================= ADMIN-ONLY ENDPOINTS =================

// Verification middleware to simulate roles in a fast stateless session
function reqAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminId = req.headers["x-admin-id"] as string;
  if (!adminId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const db = readDb();
  const user = db.users.find((u: any) => u.id === adminId && u.role === "admin");
  if (!user) {
    return res.status(430).json({ error: "Unauthorized access: Admin role required" });
  }
  next();
}

// 1. Courses CRUD
app.get("/api/courses", (req, res) => {
  const db = readDb();
  res.json(db.courses);
});

app.post("/api/courses", reqAdmin, (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: "Course name and code are required" });
  }

  const db = readDb();
  const cleanCode = code.toUpperCase().trim();
  if (db.courses.some((c: any) => c.code === cleanCode)) {
    return res.status(400).json({ error: "Course with this code already exists" });
  }

  const newCourse = {
    id: "crs-" + generateId(),
    name: name.trim(),
    code: cleanCode
  };

  db.courses.push(newCourse);
  writeDb(db);
  res.status(201).json(newCourse);
});

app.patch("/api/courses/:id", reqAdmin, (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: "Course name and code are required" });
  }

  const db = readDb();
  const courseIndex = db.courses.findIndex((c: any) => c.id === id);
  if (courseIndex === -1) {
    return res.status(404).json({ error: "Course not found" });
  }

  const cleanCode = code.toUpperCase().trim();
  // Ensure unique course code
  const isDuplicate = db.courses.some((c: any) => c.id !== id && c.code === cleanCode);
  if (isDuplicate) {
    return res.status(400).json({ error: "Another course with this code already exists" });
  }

  // Also update course name or code in associated students if they are modeled with static code/names
  db.courses[courseIndex] = {
    ...db.courses[courseIndex],
    name: name.trim(),
    code: cleanCode
  };

  writeDb(db);
  res.json(db.courses[courseIndex]);
});

app.delete("/api/courses/:id", reqAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  // Check if course has classes or subjects
  const hasClasses = db.classes.some((c: any) => c.courseId === id);
  const hasSubjects = db.subjects.some((s: any) => s.courseId === id);
  if (hasClasses || hasSubjects) {
     return res.status(400).json({ error: "Cannot delete course: It has associated classes or subjects." });
  }

  db.courses = db.courses.filter((c: any) => c.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// 2. Classes CRUD
app.get("/api/classes", (req, res) => {
  const db = readDb();
  res.json(db.classes);
});

app.post("/api/classes", reqAdmin, (req, res) => {
  const { name, courseId } = req.body;
  if (!name || !courseId) {
    return res.status(400).json({ error: "Class name and course selection are required" });
  }

  const db = readDb();
  // Ensure course exists
  const course = db.courses.find((c: any) => c.id === courseId);
  if (!course) {
    return res.status(400).json({ error: "Selected course does not exist" });
  }

  // Ensure class name is unique in this course
  if (db.classes.some((c: any) => c.name.toLowerCase() === name.toLowerCase() && c.courseId === courseId)) {
    return res.status(400).json({ error: "A class with this name already exists for this course" });
  }

  const newClass = {
    id: "cls-" + generateId(),
    name: name.trim(),
    courseId
  };

  db.classes.push(newClass);
  writeDb(db);
  res.status(201).json(newClass);
});

app.delete("/api/classes/:id", reqAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  // Check if class has students or attendance registered
  const hasStudents = db.students.some((s: any) => s.classId === id);
  const hasAttendance = db.attendance.some((a: any) => a.classId === id);
  if (hasStudents || hasAttendance) {
    return res.status(400).json({ error: "Cannot delete class: Associated students or attendance logs exist." });
  }

  db.classes = db.classes.filter((c: any) => c.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// 3. Subjects CRUD
app.get("/api/subjects", (req, res) => {
  const db = readDb();
  res.json(db.subjects);
});

app.post("/api/subjects", reqAdmin, (req, res) => {
  const { name, code, courseId } = req.body;
  if (!name || !code || !courseId) {
    return res.status(400).json({ error: "Subject name, code, and course selection are required" });
  }

  const db = readDb();
  const cleanCode = code.toUpperCase().trim();
  // Ensure course exists
  const course = db.courses.find((c: any) => c.id === courseId);
  if (!course) {
    return res.status(400).json({ error: "Selected course does not exist" });
  }

  // Ensure unique code
  if (db.subjects.some((s: any) => s.code === cleanCode)) {
    return res.status(400).json({ error: "Subject code already exists" });
  }

  const newSubject = {
    id: "sbj-" + generateId(),
    name: name.trim(),
    code: cleanCode,
    courseId
  };

  db.subjects.push(newSubject);
  writeDb(db);
  res.status(201).json(newSubject);
});

app.delete("/api/subjects/:id", reqAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  // Ensure no attendance logs exist for this subject
  const hasAttendance = db.attendance.some((a: any) => a.subjectId === id);
  if (hasAttendance) {
    return res.status(400).json({ error: "Cannot delete subject: Associated attendance history exists." });
  }

  db.subjects = db.subjects.filter((s: any) => s.id !== id);
  // Also clean up subject-faculty associations
  db.subject_faculty = db.subject_faculty.filter((sf: any) => sf.subjectId !== id);

  writeDb(db);
  res.json({ success: true });
});

// 4. Faculty Creation (User creation + Faculty creation)
app.get("/api/faculty", (req, res) => {
  const db = readDb();
  // Augment with user information
  const augmented = db.faculty.map((f: any) => {
    const user = db.users.find((u: any) => u.id === f.userId) || {};
    return {
      ...f,
      username: user.username,
      active: !!user.id
    };
  });
  res.json(augmented);
});

app.post("/api/faculty", reqAdmin, (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: "All profile and credential fields are required" });
  }

  const db = readDb();
  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  // Check unique username
  if (db.users.some((u: any) => u.username === cleanUsername)) {
    return res.status(400).json({ error: "Username is already token" });
  }

  // Check unique email
  if (db.faculty.some((f: any) => f.email === cleanEmail)) {
    return res.status(400).json({ error: "Email is already in use by another faculty" });
  }

  const userId = "usr-" + generateId();
  const facultyId = "fcl-" + generateId();

  // 1. Create User
  const newUser = {
    id: userId,
    username: cleanUsername,
    password,
    role: "faculty",
    name: name.trim()
  };

  // 2. Create Faculty record
  const newFaculty = {
    id: facultyId,
    userId,
    name: name.trim(),
    email: cleanEmail
  };

  db.users.push(newUser);
  db.faculty.push(newFaculty);
  writeDb(db);

  res.status(201).json({
    ...newFaculty,
    username: newUser.username
  });
});

app.delete("/api/faculty/:id", reqAdmin, (req, res) => {
  const { id } = req.params; // Faculty ID
  const db = readDb();

  const faculty = db.faculty.find((f: any) => f.id === id);
  if (!faculty) {
    return res.status(404).json({ error: "Faculty not found" });
  }

  // Check if faculty has assigned subjects or registered attendance
  const hasSubjects = db.subject_faculty.some((sf: any) => sf.facultyId === id);
  const hasAttendance = db.attendance.some((a: any) => a.markedByFacultyId === id);
  if (hasSubjects || hasAttendance) {
    return res.status(400).json({ error: "Cannot delete faculty: Faculty has active subject assignments or marked attendance." });
  }

  db.faculty = db.faculty.filter((f: any) => f.id !== id);
  db.users = db.users.filter((u: any) => u.id !== faculty.userId);
  writeDb(db);

  res.json({ success: true });
});

// 5. Student Creation (User creation + Student creation)
app.get("/api/students", (req, res) => {
  const db = readDb();
  const augmented = db.students.map((s: any) => {
    const user = db.users.find((u: any) => u.id === s.userId) || {};
    const course = db.courses.find((c: any) => c.id === s.courseId) || {};
    const classObj = db.classes.find((cl: any) => cl.id === s.classId) || {};
    return {
      ...s,
      username: user.username,
      courseName: course.name,
      courseCode: course.code,
      className: classObj.name
    };
  });
  res.json(augmented);
});

app.post("/api/students", reqAdmin, (req, res) => {
  const { name, rollNumber, courseId, classId, username, password } = req.body;
  if (!name || !rollNumber || !courseId || !classId || !username || !password) {
    return res.status(400).json({ error: "All profile, academic, and credential fields are required" });
  }

  const db = readDb();
  const cleanUsername = username.toLowerCase().trim();
  const cleanRollNum = rollNumber.toUpperCase().trim();

  // Validate course and class
  const course = db.courses.find((c: any) => c.id === courseId);
  const classObj = db.classes.find((cl: any) => cl.id === classId);
  if (!course || !classObj) {
    return res.status(400).json({ error: "Selected course or class does not exist" });
  }
  if (classObj.courseId !== courseId) {
    return res.status(400).json({ error: "Selected class does not belong to the selected course" });
  }

  // Verify unique username
  if (db.users.some((u: any) => u.username === cleanUsername)) {
    return res.status(400).json({ error: "Username is already occupied" });
  }

  // Verify unique roll number
  if (db.students.some((s: any) => s.rollNumber === cleanRollNum)) {
    return res.status(400).json({ error: "Roll Number is already registered" });
  }

  const userId = "usr-" + generateId();
  const studentId = "std-" + generateId();

  const newUser = {
    id: userId,
    username: cleanUsername,
    password,
    role: "student",
    name: name.trim()
  };

  const newStudent = {
    id: studentId,
    userId,
    name: name.trim(),
    rollNumber: cleanRollNum,
    courseId,
    classId
  };

  db.users.push(newUser);
  db.students.push(newStudent);
  writeDb(db);

  res.status(201).json({
    ...newStudent,
    username: newUser.username,
    courseName: course.name,
    className: classObj.name
  });
});

app.delete("/api/students/:id", reqAdmin, (req, res) => {
  const { id } = req.params; // Student ID
  const db = readDb();

  const student = db.students.find((s: any) => s.id === id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  // Ensure no attendance records exist for this student or requests have been made
  const hasAttendance = db.attendance.some((a: any) => a.records.some((r: any) => r.studentId === id));
  if (hasAttendance) {
    return res.status(400).json({ error: "Cannot delete student: Student has existing attendance entries." });
  }

  db.students = db.students.filter((s: any) => s.id !== id);
  db.users = db.users.filter((u: any) => u.id !== student.userId);
  db.requests = db.requests.filter((r: any) => r.studentId !== id);

  writeDb(db);
  res.json({ success: true });
});

// 6. Assign Subject to Faculty
app.get("/api/subject-faculty", (req, res) => {
  const db = readDb();
  const augmented = db.subject_faculty.map((sf: any) => {
    const subject = db.subjects.find((s: any) => s.id === sf.subjectId) || {};
    const faculty = db.faculty.find((f: any) => f.id === sf.facultyId) || {};
    const course = db.courses.find((c: any) => c.id === subject.courseId) || {};
    return {
      ...sf,
      subjectName: subject.name,
      subjectCode: subject.code,
      facultyName: faculty.name,
      courseName: course.name
    };
  });
  res.json(augmented);
});

app.post("/api/subject-faculty", reqAdmin, (req, res) => {
  const { subjectId, facultyId } = req.body;
  if (!subjectId || !facultyId) {
    return res.status(400).json({ error: "Subject selection and Faculty selection are required" });
  }

  const db = readDb();

  // Validate subject & faculty exists
  const subject = db.subjects.find((s: any) => s.id === subjectId);
  const faculty = db.faculty.find((f: any) => f.id === facultyId);

  if (!subject || !faculty) {
    return res.status(400).json({ error: "Selected subject or faculty does not exist" });
  }

  // Check duplicate assignment
  const exists = db.subject_faculty.some((sf: any) => sf.subjectId === subjectId && sf.facultyId === facultyId);
  if (exists) {
    return res.status(400).json({ error: "This subject is already assigned to the selected faculty" });
  }

  const newAssignment = {
    id: "sbf-" + generateId(),
    subjectId,
    facultyId
  };

  db.subject_faculty.push(newAssignment);
  writeDb(db);

  res.status(201).json({
    ...newAssignment,
    subjectName: subject.name,
    subjectCode: subject.code,
    facultyName: faculty.name
  });
});

app.delete("/api/subject-faculty/:id", reqAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.subject_faculty = db.subject_faculty.filter((sf: any) => sf.id !== id);
  writeDb(db);
  res.json({ success: true });
});


// ================= FACULTY ENDPOINTS =================

// Verification middleware for Faculty access
function reqFaculty(req: express.Request, res: express.Response, next: express.NextFunction) {
  const facultyId = req.headers["x-faculty-id"] as string; // Could be userId or facultyId, check both
  if (!facultyId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const db = readDb();
  // Check if this matches a faculty user ID or is a faculty record ID
  const user = db.users.find((u: any) => u.id === facultyId && u.role === "faculty");
  const faculty = db.faculty.find((f: any) => f.id === facultyId || f.userId === facultyId);

  if (!user && !faculty) {
    return res.status(403).json({ error: "Unauthorized access: Faculty role required" });
  }
  next();
}

// Fetch assigned subjects for a given faculty
app.get("/api/faculty/:id/assignments", reqFaculty, (req, res) => {
  const { id } = req.params; // Faculty ID or userId
  const db = readDb();

  // Find faculty record ID if user ID was passed
  let facultyRecord = db.faculty.find((f: any) => f.id === id || f.userId === id);
  if (!facultyRecord) {
    return res.status(404).json({ error: "Faculty profile not found" });
  }

  const assignments = db.subject_faculty.filter((sf: any) => sf.facultyId === facultyRecord.id);
  const augmented = assignments.map((sf: any) => {
    const subject = db.subjects.find((s: any) => s.id === sf.subjectId) || {};
    const course = db.courses.find((c: any) => c.id === subject.courseId) || {};
    // Get classes associated with this course
    const classes = db.classes.filter((cl: any) => cl.courseId === course.id);
    return {
      id: sf.id,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      courseId: course.id,
      courseName: course.name,
      classes: classes.map((cl: any) => ({ id: cl.id, name: cl.name }))
    };
  });

  res.json(augmented);
});

// Fetch students belonging to a class
app.get("/api/classes/:classId/students", (req, res) => {
  const { classId } = req.params;
  const db = readDb();
  const students = db.students.filter((s: any) => s.classId === classId);
  res.json(students);
});

// Mark / Save Attendance
app.post("/api/attendance", reqFaculty, (req, res) => {
  const { classId, subjectId, date, records, markedByFacultyId } = req.body;
  if (!classId || !subjectId || !date || !records || !Array.isArray(records) || !markedByFacultyId) {
    return res.status(400).json({ error: "Class, Subject, Date, Records list, and Faculty signature are required" });
  }

  const db = readDb();

  // Validate faculty ID or userId
  const faculty = db.faculty.find((f: any) => f.id === markedByFacultyId || f.userId === markedByFacultyId);
  if (!faculty) {
    return res.status(400).json({ error: "Signing faculty record does not exist" });
  }

  // Parse date
  const cleanDate = date.trim(); // "YYYY-MM-DD"

  // Check if attendance already marked for this class, subject and date to prevent duplicate logs
  const existingIndex = db.attendance.findIndex((a: any) =>
    a.classId === classId && a.subjectId === subjectId && a.date === cleanDate
  );

  const attendanceLogId = existingIndex >= 0 ? db.attendance[existingIndex].id : "att-" + generateId();

  const attendanceEntry = {
    id: attendanceLogId,
    classId,
    subjectId,
    date: cleanDate,
    records,
    markedByFacultyId: faculty.id,
    createdAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    // Overwrite/Update existing daily attendance log
    db.attendance[existingIndex] = attendanceEntry;
  } else {
    db.attendance.push(attendanceEntry);
  }

  writeDb(db);

  // Send real notifications to students who were marked absent
  records.forEach((rec: any) => {
    if (rec.status === "absent") {
      const student = db.students.find((s: any) => s.id === rec.studentId);
      if (student) {
        const subject = db.subjects.find((s: any) => s.id === subjectId) || { name: "Subject" };
        const notifId = "ntf-" + generateId();
        db.notifications.push({
          id: notifId,
          recipientId: student.userId,
          title: "Absence Marked",
          message: `You have been marked absent for ${subject.name} on ${cleanDate}.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  });

  writeDb(db);

  res.status(201).json({
    success: true,
    attendance: attendanceEntry,
    message: existingIndex >= 0 ? "Attendance logs updated successfully." : "Attendance marked successfully."
  });
});

// View attendance history filtered by class and subject
app.get("/api/attendance/history", (req, res) => {
  const { classId, subjectId } = req.query;
  const db = readDb();
  let filtered = db.attendance;
  if (classId) {
    filtered = filtered.filter((a: any) => a.classId === classId);
  }
  if (subjectId) {
    filtered = filtered.filter((a: any) => a.subjectId === subjectId);
  }
  res.json(filtered);
});


// ================= STUDENT ENDPOINTS =================

// Fetch individual student statistics and attendance logs
app.get("/api/students/:id/attendance", (req, res) => {
  const { id } = req.params; // Could be Student ID or Student's User ID
  const db = readDb();

  // Find student profile first
  let student = db.students.find((s: any) => s.id === id || s.userId === id);
  if (!student) {
    return res.status(404).json({ error: "Student profile not found" });
  }

  // Get all subjects corresponding to the student's course
  const courseSubjects = db.subjects.filter((sub: any) => sub.courseId === student.courseId);

  // Find all attendance records involving this student's class
  const classAttendance = db.attendance.filter((att: any) => att.classId === student.classId);

  // Get all approved requests for this student to dynamically adjust attendance records
  const approvedRequests = db.requests.filter((r: any) => r.studentId === student.id && r.status === "approved");

  // Compute attendance stats per subject
  const subjectStats = courseSubjects.map((sub: any) => {
    const subjectLogs = classAttendance.filter((att: any) => att.subjectId === sub.id);
    const totalSessions = subjectLogs.length;

    let presentCount = 0;
    const details = subjectLogs.map((log: any) => {
      const record = log.records.find((rec: any) => rec.studentId === student.id);
      let status = record ? record.status : "not_marked";

      // Dynamically override absent status if student has approved leave or correction request for this date
      if (status === "absent") {
        const hasApprovedRequest = approvedRequests.some((r: any) => {
          if (r.type === "correction" && r.date === log.date) {
            return true;
          }
          if (r.type === "leave") {
            if (r.date === log.date) return true;
            if (r.fromDate && r.toDate && log.date >= r.fromDate && log.date <= r.toDate) {
              return true;
            }
          }
          return false;
        });

        if (hasApprovedRequest) {
          status = "present";
        }
      }

      if (status === "present") presentCount++;

      // Find faculty email / name
      const faculty = db.faculty.find((f: any) => f.id === log.markedByFacultyId) || { name: "Unknown" };

      return {
        attendanceId: log.id,
        date: log.date,
        status,
        markedBy: faculty.name
      };
    }).sort((a: any, b: any) => b.date.localeCompare(a.date)); // descending date

    const percentage = totalSessions > 0 ? parseFloat(((presentCount / totalSessions) * 100).toFixed(1)) : 100.0;

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      totalSessions,
      presentSessions: presentCount,
      absentSessions: totalSessions - presentCount,
      percentage,
      history: details
    };
  });

  // Calculate overall statistics
  const totalClasses = subjectStats.reduce((sum: number, next: any) => sum + next.totalSessions, 0);
  const totalPresent = subjectStats.reduce((sum: number, next: any) => sum + next.presentSessions, 0);
  const overallPercentage = totalClasses > 0 ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1)) : 100.0;

  res.json({
    studentProfile: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      courseId: student.courseId,
      classId: student.classId
    },
    overallStats: {
      totalClasses,
      totalPresent,
      totalAbsent: totalClasses - totalPresent,
      overallPercentage
    },
    subjectStats
  });
});


// ================= REQUESTS ENDPOINTS (LEAVE/CORRECTIONS) =================

// Create a Request (Student only)
app.post("/api/requests", (req, res) => {
  const { studentId, title, description, type, date, fromDate, toDate, totalLeaveDays } = req.body;
  if (!studentId || !title || !description || !type) {
    return res.status(400).json({ error: "Student ID, title, description, and request type are required." });
  }

  const db = readDb();
  // Validate student profile
  const student = db.students.find((s: any) => s.id === studentId || s.userId === studentId);
  if (!student) {
    return res.status(404).json({ error: "Student profile not found." });
  }

  const newRequest = {
    id: "req-" + generateId(),
    studentId: student.id, // Normalized Student ID
    title: title.trim(),
    description: description.trim(),
    type, // "leave" | "correction"
    status: "pending",
    date: date ? date.trim() : null,
    fromDate: fromDate ? fromDate.trim() : null,
    toDate: toDate ? toDate.trim() : null,
    totalLeaveDays: totalLeaveDays || null,
    createdAt: new Date().toISOString()
  };

  db.requests.push(newRequest);
  writeDb(db);

  // Send a notify to Admin users
  const notifyId = "ntf-" + generateId();
  db.notifications.push({
    id: notifyId,
    recipientId: "all-admins",
    recipientRole: "admin",
    title: "New Request Submitted",
    message: `Student ${student.name} submitted a ${type} request: "${title}".`,
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeDb(db);

  res.status(201).json(newRequest);
});

// View Requests list (Admins can view ALL, Student can view own)
app.get("/api/requests", (req, res) => {
  const { studentId } = req.query;
  const db = readDb();

  let filtered = db.requests;
  if (studentId) {
    // If studentId matches userId, convert to student ID
    const student = db.students.find((s: any) => s.id === studentId || s.userId === studentId);
    if (student) {
      filtered = db.requests.filter((r: any) => r.studentId === student.id);
    } else {
      filtered = [];
    }
  }

  // Augment with student details
  const augmented = filtered.map((r: any) => {
    const student = db.students.find((s: any) => s.id === r.studentId) || {};
    const classObj = db.classes.find((c: any) => c.id === student.classId) || {};
    return {
      ...r,
      studentName: student.name || "Unknown Student",
      studentRollNumber: student.rollNumber || "N/A",
      className: classObj.name || "N/A"
    };
  }).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));

  res.json(augmented);
});

// Approve or Reject structural requests (Admin only)
app.patch("/api/requests/:id", reqAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "approved" | "rejected"
  if (!status || (status !== "approved" && status !== "rejected")) {
    return res.status(400).json({ error: "Invalid status state transition." });
  }

  const db = readDb();
  const requestIndex = db.requests.findIndex((r: any) => r.id === id);
  if (requestIndex === -1) {
    return res.status(404).json({ error: "Request not found." });
  }

  const request = db.requests[requestIndex];
  request.status = status;
  db.requests[requestIndex] = request;

  // Perform state synchronization: if an attendance correction or leave request is approved,
  // we update the corresponding daily attendance logs in db.attendance to marked as present.
  if (status === "approved") {
    const studentObj = db.students.find((s: any) => s.id === request.studentId);
    if (studentObj) {
      db.attendance.forEach((att: any) => {
        if (att.classId === studentObj.classId) {
          let dateMatches = false;
          if (request.type === "correction" && att.date === request.date) {
            dateMatches = true;
          } else if (request.type === "leave") {
            if (att.date === request.date) dateMatches = true;
            if (request.fromDate && request.toDate && att.date >= request.fromDate && att.date <= request.toDate) {
              dateMatches = true;
            }
          }

          if (dateMatches) {
            const recIndex = att.records.findIndex((rec: any) => rec.studentId === request.studentId);
            if (recIndex !== -1) {
              att.records[recIndex].status = "present";
            } else {
              att.records.push({ studentId: request.studentId, status: "present" });
            }
          }
        }
      });
    }
  }

  // Usually this is an offline correction or faculty fixes it. Let's send a notification to the student about decision.
  const student = db.students.find((s: any) => s.id === request.studentId);
  if (student) {
    const notifId = "ntf-" + generateId();
    db.notifications.push({
      id: notifId,
      recipientId: student.userId,
      title: `Request ${status.toUpperCase()}`,
      message: `Your ${request.type} request "${request.title}" has been ${status} by the administrator.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDb(db);
  res.json({ success: true, request });
});


// ================= NOTIFICATIONS ENDPOINTS =================

// Get notifications forlogged user
app.get("/api/notifications", (req, res) => {
  const { userId, role } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId parameter is required" });
  }

  const db = readDb();
  let notifications = db.notifications.filter((n: any) => {
    // Return if addressed specifically to user, or matches user's role general channel
    const matchUser = n.recipientId === userId;
    const matchRole = role && n.recipientRole === role;
    const matchGlobalAdmin = role === "admin" && n.recipientId === "all-admins";
    const matchGlobalStudent = role === "student" && n.recipientId === "all-students";
    return matchUser || matchRole || matchGlobalAdmin || matchGlobalStudent;
  }).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));

  res.json(notifications);
});

// Mark notification as read
app.patch("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.notifications.findIndex((n: any) => n.id === id);
  if (index !== -1) {
    db.notifications[index].isRead = true;
    writeDb(db);
  }
  res.json({ success: true });
});

// ================= VITE ASYNC SERVER GATEWAY =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduTrack360 server running on port ${PORT}`);
  });
}

startServer();
