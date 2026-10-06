export type UserRole = 'admin' | 'guru' | 'murid';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  username: string;
  password?: string;
  nisn?: string;
  nip?: string;
  className?: string;
  parentName?: string;
  parentPhone?: string;
  avatar?: string;
  photoUrl?: string;
  faceDescriptor?: number[];
  studentQrCode?: string;
}

export interface SchoolConfig {
  id: string;
  schoolName: string;
  schoolSubtitle: string;
  schoolLogo: string;
  schoolAddress: string;
  phone: string;
  kopTitle: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;

  // Custom Clock In Schedule
  clockInStart: string; // e.g. "06:00" - Absen awal clock in
  clockInLate: string;  // e.g. "07:15" - Batas tepat waktu
  clockInEnd: string;   // e.g. "08:30" - Batas akhir clock in

  // Custom Clock Out Schedule
  clockOutStart: string;// e.g. "14:00" - Batas awal clock out pulang
  clockOutEnd: string;  // e.g. "17:00" - Batas akhir clock out pulang

  // Backwards compatibility aliases
  checkInStartTime?: string;
  checkInEndTime?: string;
  lateThresholdTime?: string;
  checkOutStartTime?: string;

  adminUsername: string;
  adminPassword: string;
  qrSecuritySalt: string;
}

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa' | 'mencurigakan';
export type AttendanceMethod = 'face_camera' | 'qr_code' | 'manual_teacher';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  inRadius?: boolean;
  photoProof?: string;
  photoProofOut?: string;
  method: AttendanceMethod;
  isHiddenFromRecap: boolean;
  hiddenAt?: string;
  suspiciousReason?: string;
  parentNotifiedWA: boolean;
  parentNotifiedAt?: string;
  notes?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  homeroomTeacher: string;
}

export type SubmissionType = 'tahfidz' | 'tugas' | 'ibadah' | 'literasi' | 'kebiasaan_baik';
export type SubmissionStatus = 'menunggu_verifikasi' | 'disetujui' | 'perlu_perbaikan';

export interface DailySubmission {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  type: SubmissionType;
  title: string;
  details: string;
  status: SubmissionStatus;
  feedbackTeacher?: string;
  teacherName?: string;
  createdAt: string;
}

export interface DailyScheduleItem {
  day: string;
  subject: string;
  time: string;
  teacher: string;
  room: string;
}
