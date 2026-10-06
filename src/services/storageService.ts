import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  SchoolConfig,
  UserProfile,
  AttendanceRecord,
  SchoolClass,
  DailySubmission
} from '../types';
import { generateStudentEncryptedQr } from '../utils/cryptoQr';

const STORAGE_KEYS = {
  CONFIG: 'edu_school_config_v4',
  USERS: 'edu_users_v4',
  ATTENDANCE: 'edu_attendance_v4',
  CLASSES: 'edu_classes_v4',
  SUBMISSIONS: 'edu_submissions_v4'
};

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  id: 'school_main_config',
  schoolName: 'SMA SAINS TAHFIDZ ISLAMIC CENTER',
  schoolSubtitle: 'Sistem Presensi Wajah & QR Terpadu',
  schoolLogo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
  schoolAddress: 'Jl. Pendidikan Karakter No. 10, Kompleks Islamic Center',
  phone: '021-87654321',
  kopTitle: 'YAYASAN PENDIDIKAN ISLAMIC CENTER\nSMA SAINS TAHFIDZ ISLAMIC CENTER\nTERAKREDITASI A',
  latitude: -6.2088,
  longitude: 106.8456,
  radiusMeters: 150,

  // Custom Clock In Schedule
  clockInStart: '06:00',
  clockInLate: '07:15',
  clockInEnd: '08:30',

  // Custom Clock Out Schedule
  clockOutStart: '14:00',
  clockOutEnd: '17:00',

  adminUsername: 'admin',
  adminPassword: 'admin123',
  qrSecuritySalt: 'SALT_SMA_SAINS_TAHFIDZ_2026'
};

export const DEFAULT_CLASSES: SchoolClass[] = [
  { id: 'c1', name: 'X IPA 1', homeroomTeacher: 'Ustadz Budi Santoso, S.Pd.' },
  { id: 'c2', name: 'XI IPA 2', homeroomTeacher: 'Ustadzah Siti Rahmawati, M.Pd.' },
  { id: 'c3', name: 'XII IPS 1', homeroomTeacher: 'Ustadz Ahmad Fauzi, S.Kom.' }
];

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'u_admin',
    role: 'admin',
    name: 'Administrator Sekolah',
    username: 'admin',
    password: 'admin123'
  },
  {
    id: 'u_guru1',
    role: 'guru',
    name: 'Ustadz Budi Santoso, S.Pd.',
    username: 'guru1',
    password: 'guru123',
    nip: '198405122008011005',
    className: 'X IPA 1'
  },
  {
    id: 'u_guru2',
    role: 'guru',
    name: 'Ustadzah Siti Rahmawati, M.Pd.',
    username: 'guru2',
    password: 'guru123',
    nip: '198809182012022003',
    className: 'XI IPA 2'
  },
  // Students with encrypted QR tokens
  {
    id: 'u_siswa1',
    role: 'murid',
    name: 'Muhammad Raihan',
    username: 'raihan',
    nisn: '0071234561',
    className: 'X IPA 1',
    parentName: 'Bapak H. Sudirman',
    parentPhone: '081234567890',
    studentQrCode: generateStudentEncryptedQr(
      { id: 'u_siswa1', nisn: '0071234561', name: 'Muhammad Raihan', className: 'X IPA 1' },
      DEFAULT_SCHOOL_CONFIG.qrSecuritySalt
    )
  },
  {
    id: 'u_siswa2',
    role: 'murid',
    name: 'Alya Syahfitri',
    username: 'alya',
    nisn: '0071234562',
    className: 'X IPA 1',
    parentName: 'Ibu Ratna',
    parentPhone: '081398765432',
    studentQrCode: generateStudentEncryptedQr(
      { id: 'u_siswa2', nisn: '0071234562', name: 'Alya Syahfitri', className: 'X IPA 1' },
      DEFAULT_SCHOOL_CONFIG.qrSecuritySalt
    )
  }
];

export const DEFAULT_SUBMISSIONS: DailySubmission[] = [
  {
    id: 'sub_1',
    studentId: 'u_siswa1',
    studentName: 'Muhammad Raihan',
    className: 'X IPA 1',
    date: new Date().toISOString().split('T')[0],
    type: 'tahfidz',
    title: 'Surah An-Naba Ayat 1 - 25',
    details: 'Hafalan sangat lancar dengan hukum tajwid Mad Thobi\'i dan Ghunnah tertib.',
    status: 'disetujui',
    feedbackTeacher: 'Mumtaz! Lanjutkan hafalan surat berikutnya besok.',
    teacherName: 'Ustadz Budi Santoso, S.Pd.',
    createdAt: new Date().toISOString()
  }
];

function saveLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

class StorageService {
  private config: SchoolConfig = DEFAULT_SCHOOL_CONFIG;
  private users: UserProfile[] = DEFAULT_USERS;
  private attendances: AttendanceRecord[] = [];
  private classes: SchoolClass[] = DEFAULT_CLASSES;
  private submissions: DailySubmission[] = DEFAULT_SUBMISSIONS;

  constructor() {
    this.initLocal();
    this.initCloudSync();
  }

  private initLocal() {
    this.config = loadLocal(STORAGE_KEYS.CONFIG, DEFAULT_SCHOOL_CONFIG);
    this.users = loadLocal(STORAGE_KEYS.USERS, DEFAULT_USERS);
    this.attendances = loadLocal(STORAGE_KEYS.ATTENDANCE, []);
    this.classes = loadLocal(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    this.submissions = loadLocal(STORAGE_KEYS.SUBMISSIONS, DEFAULT_SUBMISSIONS);
  }

  private async initCloudSync() {
    try {
      const configDoc = doc(db, 'configs', 'school_main_config');
      onSnapshot(configDoc, (snap) => {
        if (snap.exists()) {
          this.config = snap.data() as SchoolConfig;
          saveLocal(STORAGE_KEYS.CONFIG, this.config);
        } else {
          setDoc(configDoc, this.config).catch(() => {});
        }
      }, () => {});

      const usersCol = collection(db, 'users');
      onSnapshot(usersCol, (snap) => {
        if (!snap.empty) {
          const list: UserProfile[] = [];
          snap.forEach((d) => list.push(d.data() as UserProfile));
          if (list.length > 0) {
            this.users = list;
            saveLocal(STORAGE_KEYS.USERS, this.users);
          }
        } else {
          DEFAULT_USERS.forEach((u) => {
            setDoc(doc(db, 'users', u.id), u).catch(() => {});
          });
        }
      }, () => {});

      const attCol = collection(db, 'attendances');
      onSnapshot(attCol, (snap) => {
        if (!snap.empty) {
          const list: AttendanceRecord[] = [];
          snap.forEach((d) => list.push(d.data() as AttendanceRecord));
          this.attendances = list;
          saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);
        }
      }, () => {});

      const subCol = collection(db, 'submissions');
      onSnapshot(subCol, (snap) => {
        if (!snap.empty) {
          const list: DailySubmission[] = [];
          snap.forEach((d) => list.push(d.data() as DailySubmission));
          this.submissions = list;
          saveLocal(STORAGE_KEYS.SUBMISSIONS, this.submissions);
        } else {
          DEFAULT_SUBMISSIONS.forEach((s) => {
            setDoc(doc(db, 'submissions', s.id), s).catch(() => {});
          });
        }
      }, () => {});
    } catch {
      // Offline fallback
    }
  }

  getConfig(): SchoolConfig {
    return { ...this.config };
  }

  async updateConfig(newConfig: Partial<SchoolConfig>): Promise<SchoolConfig> {
    this.config = { ...this.config, ...newConfig };
    saveLocal(STORAGE_KEYS.CONFIG, this.config);
    try {
      const configDoc = doc(db, 'configs', 'school_main_config');
      await setDoc(configDoc, this.config, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'configs/school_main_config');
    }
    return this.config;
  }

  getUsers(): UserProfile[] {
    return [...this.users];
  }

  async saveUser(user: UserProfile): Promise<UserProfile> {
    // If student doesn't have an encrypted QR code yet, generate one
    if (user.role === 'murid' && (!user.studentQrCode || !user.studentQrCode.startsWith('PROPRIETARY-'))) {
      user.studentQrCode = generateStudentEncryptedQr(
        { id: user.id, nisn: user.nisn, name: user.name, className: user.className },
        this.config.qrSecuritySalt
      );
    }

    const idx = this.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push(user);
    }
    saveLocal(STORAGE_KEYS.USERS, this.users);
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    }
    return user;
  }

  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const idx = this.users.findIndex((u) => u.id === userId);
    if (idx < 0) return null;

    const updatedUser = { ...this.users[idx], ...updates };

    // Regenerate QR if name or NISN changed
    if (updatedUser.role === 'murid' && (updates.name || updates.nisn || updates.className)) {
      updatedUser.studentQrCode = generateStudentEncryptedQr(
        { id: updatedUser.id, nisn: updatedUser.nisn, name: updatedUser.name, className: updatedUser.className },
        this.config.qrSecuritySalt
      );
    }

    this.users[idx] = updatedUser;
    saveLocal(STORAGE_KEYS.USERS, this.users);

    try {
      await updateDoc(doc(db, 'users', userId), updates);
    } catch {
      // Local fallback
    }
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    this.users = this.users.filter((u) => u.id !== userId);
    saveLocal(STORAGE_KEYS.USERS, this.users);
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  }

  getClasses(): SchoolClass[] {
    return [...this.classes];
  }

  saveClasses(classes: SchoolClass[]) {
    this.classes = classes;
    saveLocal(STORAGE_KEYS.CLASSES, this.classes);
  }

  async updateClass(classId: string, updates: Partial<SchoolClass>): Promise<void> {
    const idx = this.classes.findIndex((c) => c.id === classId);
    if (idx >= 0) {
      this.classes[idx] = { ...this.classes[idx], ...updates };
      saveLocal(STORAGE_KEYS.CLASSES, this.classes);
    }
  }

  getAttendances(includeHidden = false): AttendanceRecord[] {
    if (includeHidden) {
      return [...this.attendances];
    }
    return this.attendances.filter((a) => !a.isHiddenFromRecap);
  }

  getAllAttendancesIncludingHidden(): AttendanceRecord[] {
    return [...this.attendances];
  }

  async updateAttendance(recordId: string, updates: Partial<AttendanceRecord>): Promise<void> {
    const idx = this.attendances.findIndex((a) => a.id === recordId);
    if (idx >= 0) {
      this.attendances[idx] = { ...this.attendances[idx], ...updates };
      saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);
      try {
        await updateDoc(doc(db, 'attendances', recordId), updates);
      } catch {
        // Local fallback
      }
    }
  }

  async processAttendance(
    studentId: string,
    actionType: 'clock_in' | 'clock_out',
    details: {
      studentName: string;
      className: string;
      timeStr: string;
      dateStr: string;
      status?: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa' | 'mencurigakan';
      photoProof?: string;
      method: 'face_camera' | 'qr_code' | 'manual_teacher';
      latitude?: number;
      longitude?: number;
      distanceMeters?: number;
      inRadius?: boolean;
      suspiciousReason?: string;
    }
  ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
    const existing = this.attendances.find(
      (a) => a.studentId === studentId && a.date === details.dateStr
    );

    if (actionType === 'clock_in') {
      if (existing && existing.checkInTime) {
        return {
          success: false,
          message: `Siswa "${details.studentName}" sudah melakukan Clock In hari ini pada pukul ${existing.checkInTime} WIB!`
        };
      }

      const record: AttendanceRecord = {
        id: existing?.id || `att_${studentId}_${details.dateStr}`,
        studentId,
        studentName: details.studentName,
        className: details.className,
        date: details.dateStr,
        checkInTime: details.timeStr,
        status: details.status || 'hadir',
        latitude: details.latitude,
        longitude: details.longitude,
        distanceMeters: details.distanceMeters,
        inRadius: details.inRadius,
        photoProof: details.photoProof,
        method: details.method,
        isHiddenFromRecap: false,
        suspiciousReason: details.suspiciousReason,
        parentNotifiedWA: false,
        notes: `Clock In pada ${details.timeStr} WIB (${details.method})`
      };

      await this.saveAttendanceRecord(record);
      return {
        success: true,
        message: `Clock In Berhasil untuk ${details.studentName} pada ${details.timeStr} WIB.`,
        record
      };
    } else {
      // Clock Out
      if (existing && existing.checkOutTime) {
        return {
          success: false,
          message: `Siswa "${details.studentName}" sudah melakukan Clock Out hari ini pada pukul ${existing.checkOutTime} WIB!`
        };
      }

      const record: AttendanceRecord = {
        id: existing?.id || `att_${studentId}_${details.dateStr}`,
        studentId,
        studentName: details.studentName,
        className: details.className,
        date: details.dateStr,
        checkInTime: existing?.checkInTime,
        checkOutTime: details.timeStr,
        status: existing?.status || 'hadir',
        latitude: details.latitude || existing?.latitude,
        longitude: details.longitude || existing?.longitude,
        distanceMeters: details.distanceMeters || existing?.distanceMeters,
        inRadius: details.inRadius ?? existing?.inRadius,
        photoProof: existing?.photoProof,
        photoProofOut: details.photoProof,
        method: details.method,
        isHiddenFromRecap: existing?.isHiddenFromRecap || false,
        suspiciousReason: details.suspiciousReason || existing?.suspiciousReason,
        parentNotifiedWA: existing?.parentNotifiedWA || false,
        notes: (existing?.notes ? existing.notes + ' • ' : '') + `Clock Out pada ${details.timeStr} WIB`
      };

      await this.saveAttendanceRecord(record);
      return {
        success: true,
        message: `Clock Out Pulang Berhasil untuk ${details.studentName} pada ${details.timeStr} WIB.`,
        record
      };
    }
  }

  async deleteAttendanceRecord(recordId: string): Promise<void> {
    this.attendances = this.attendances.filter((a) => a.id !== recordId);
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);
    try {
      await deleteDoc(doc(db, 'attendances', recordId));
    } catch {
      // Local fallback
    }
  }

  private async saveAttendanceRecord(record: AttendanceRecord) {
    const existingIndex = this.attendances.findIndex((a) => a.id === record.id);
    if (existingIndex >= 0) {
      this.attendances[existingIndex] = record;
    } else {
      this.attendances = [record, ...this.attendances];
    }
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);
    try {
      await setDoc(doc(db, 'attendances', record.id), record);
    } catch {
      // Local fallback
    }
  }

  async softClearRecapTrace(date?: string, className?: string): Promise<number> {
    const timestamp = new Date().toISOString();
    let count = 0;

    const updated = this.attendances.map((item) => {
      let match = true;
      if (date && item.date !== date) match = false;
      if (className && item.className !== className) match = false;

      if (match && !item.isHiddenFromRecap) {
        count++;
        return {
          ...item,
          isHiddenFromRecap: true,
          hiddenAt: timestamp
        };
      }
      return item;
    });

    this.attendances = updated;
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);

    for (const item of updated) {
      if (item.isHiddenFromRecap && item.hiddenAt === timestamp) {
        try {
          await updateDoc(doc(db, 'attendances', item.id), {
            isHiddenFromRecap: true,
            hiddenAt: timestamp
          });
        } catch {
          // ignore
        }
      }
    }
    return count;
  }

  async restoreRecapTrace(date?: string): Promise<number> {
    let count = 0;
    const updated = this.attendances.map((item) => {
      if ((!date || item.date === date) && item.isHiddenFromRecap) {
        count++;
        return {
          ...item,
          isHiddenFromRecap: false,
          hiddenAt: undefined
        };
      }
      return item;
    });

    this.attendances = updated;
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);

    for (const item of updated) {
      if (!item.isHiddenFromRecap) {
        try {
          await updateDoc(doc(db, 'attendances', item.id), {
            isHiddenFromRecap: false,
            hiddenAt: null
          });
        } catch {
          // ignore
        }
      }
    }
    return count;
  }

  async markParentNotified(recordId: string): Promise<void> {
    const idx = this.attendances.findIndex((a) => a.id === recordId);
    if (idx >= 0) {
      this.attendances[idx].parentNotifiedWA = true;
      this.attendances[idx].parentNotifiedAt = new Date().toISOString();
      saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);

      try {
        await updateDoc(doc(db, 'attendances', recordId), {
          parentNotifiedWA: true,
          parentNotifiedAt: new Date().toISOString()
        });
      } catch {
        // ignore
      }
    }
  }

  // Daily Submissions (Setoran Tahfidz & Tugas)
  getSubmissions(): DailySubmission[] {
    return [...this.submissions];
  }

  async saveSubmission(sub: DailySubmission): Promise<DailySubmission> {
    const idx = this.submissions.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      this.submissions[idx] = sub;
    } else {
      this.submissions = [sub, ...this.submissions];
    }
    saveLocal(STORAGE_KEYS.SUBMISSIONS, this.submissions);
    try {
      await setDoc(doc(db, 'submissions', sub.id), sub);
    } catch {
      // Local fallback
    }
    return sub;
  }

  async updateSubmission(subId: string, updates: Partial<DailySubmission>): Promise<void> {
    const idx = this.submissions.findIndex((s) => s.id === subId);
    if (idx >= 0) {
      this.submissions[idx] = { ...this.submissions[idx], ...updates };
      saveLocal(STORAGE_KEYS.SUBMISSIONS, this.submissions);
      try {
        await updateDoc(doc(db, 'submissions', subId), updates);
      } catch {
        // Local fallback
      }
    }
  }

  async deleteSubmission(subId: string): Promise<void> {
    this.submissions = this.submissions.filter((s) => s.id !== subId);
    saveLocal(STORAGE_KEYS.SUBMISSIONS, this.submissions);
    try {
      await deleteDoc(doc(db, 'submissions', subId));
    } catch {
      // Local fallback
    }
  }

  exportAllDataAsBackup(): string {
    const backup = {
      exportTimestamp: new Date().toISOString(),
      schoolConfig: this.config,
      users: this.users,
      attendances: this.attendances,
      classes: this.classes,
      submissions: this.submissions,
      version: '4.0-edu-presensi'
    };
    return JSON.stringify(backup, null, 2);
  }

  async importBackupData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (data.schoolConfig) this.config = data.schoolConfig;
      if (Array.isArray(data.users)) this.users = data.users;
      if (Array.isArray(data.attendances)) this.attendances = data.attendances;
      if (Array.isArray(data.classes)) this.classes = data.classes;
      if (Array.isArray(data.submissions)) this.submissions = data.submissions;

      saveLocal(STORAGE_KEYS.CONFIG, this.config);
      saveLocal(STORAGE_KEYS.USERS, this.users);
      saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendances);
      saveLocal(STORAGE_KEYS.CLASSES, this.classes);
      saveLocal(STORAGE_KEYS.SUBMISSIONS, this.submissions);

      await setDoc(doc(db, 'configs', 'school_main_config'), this.config);
      for (const u of this.users) await setDoc(doc(db, 'users', u.id), u);
      for (const a of this.attendances) await setDoc(doc(db, 'attendances', a.id), a);
      for (const s of this.submissions) await setDoc(doc(db, 'submissions', s.id), s);

      return true;
    } catch {
      return false;
    }
  }
}

export const storage = new StorageService();
