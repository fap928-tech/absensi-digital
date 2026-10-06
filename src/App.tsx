/**
 * EduPresensi Pro - Sistem Presensi Cerdas Wajah & QR Terpadu
 * SMA SAINS TAHFIDZ ISLAMIC CENTER
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from './components/MainLayout';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { ClassDataView } from './components/ClassDataView';
import { StudentDataView } from './components/StudentDataView';
import { ManualAttendanceView } from './components/ManualAttendanceView';
import { AttendanceScannerView } from './components/AttendanceScannerView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { DailySubmissionsRecapView } from './components/DailySubmissionsRecapView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { PdfReportModal } from './components/PdfReportModal';
import {
  UserProfile,
  SchoolConfig,
  AttendanceRecord,
  SchoolClass,
  DailySubmission,
  AttendanceStatus
} from './types';
import { storage } from './services/storageService';

const SESSION_USER_KEY = 'edu_presensi_active_user_v4';

export default function App() {
  // Current logged in user (Guru / Admin only)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      return saved ? (JSON.parse(saved) as UserProfile) : null;
    } catch {
      return null;
    }
  });

  // State entities
  const [config, setConfig] = useState<SchoolConfig>(storage.getConfig());
  const [users, setUsers] = useState<UserProfile[]>(storage.getUsers());
  const [classes, setClasses] = useState<SchoolClass[]>(storage.getClasses());
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(storage.getAttendances());
  const [submissions, setSubmissions] = useState<DailySubmission[]>(storage.getSubmissions());

  // Active Menu Tab matching screenshot
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // PDF Export Modal State
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // Sync state helper
  const reloadState = useCallback(() => {
    setConfig(storage.getConfig());
    setUsers(storage.getUsers());
    setClasses(storage.getClasses());
    setAttendances(storage.getAttendances());
    setSubmissions(storage.getSubmissions());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      reloadState();
    }, 2500);
    return () => clearInterval(timer);
  }, [reloadState]);

  // Handle Login & Logout
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
  };

  // Restrict Guru to only dashboard, manual, scanner
  useEffect(() => {
    if (currentUser && currentUser.role === 'guru') {
      const allowedGuruTabs = ['dashboard', 'manual', 'scanner'];
      if (!allowedGuruTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // ignore
    }
  };

  // Process Attendance Clock In / Clock Out with strict duplicate prevention
  const handleProcessAttendance = async (
    studentId: string,
    actionType: 'clock_in' | 'clock_out',
    details: {
      studentName: string;
      className: string;
      timeStr: string;
      dateStr: string;
      status?: AttendanceStatus;
      photoProof?: string;
      method: 'face_camera' | 'qr_code' | 'manual_teacher';
      latitude?: number;
      longitude?: number;
      distanceMeters?: number;
      inRadius?: boolean;
      suspiciousReason?: string;
    }
  ) => {
    const res = await storage.processAttendance(studentId, actionType, details);
    reloadState();
    return res;
  };

  // Soft clear recap trace ("hapus jejak rekap absensi tapi datanya masih ada")
  const handleSoftClearRecap = async (date?: string, className?: string) => {
    const count = await storage.softClearRecapTrace(date, className);
    reloadState();
    return count;
  };

  // Restore hidden trace
  const handleRestoreRecap = async (date?: string) => {
    const count = await storage.restoreRecapTrace(date);
    reloadState();
    return count;
  };

  // Mark parent notified
  const handleMarkParentNotified = async (recordId: string) => {
    await storage.markParentNotified(recordId);
    reloadState();
  };

  // Update Config
  const handleUpdateConfig = async (newConf: Partial<SchoolConfig>) => {
    const res = await storage.updateConfig(newConf);
    setConfig(res);
    return res;
  };

  const handleDeleteAttendance = async (recordId: string) => {
    await storage.deleteAttendanceRecord(recordId);
    reloadState();
  };

  // Manage Users
  const handleSaveUser = async (user: UserProfile) => {
    const res = await storage.saveUser(user);
    reloadState();
    return res;
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    const res = await storage.updateUser(userId, updates);
    reloadState();
    return res;
  };

  const handleDeleteUser = async (userId: string) => {
    await storage.deleteUser(userId);
    reloadState();
  };

  // Manage Classes
  const handleSaveClasses = (newClasses: SchoolClass[]) => {
    storage.saveClasses(newClasses);
    reloadState();
  };

  const handleUpdateClass = async (classId: string, updates: Partial<SchoolClass>) => {
    await storage.updateClass(classId, updates);
    reloadState();
  };

  // Submissions (Setoran Tahfidz & Tugas)
  const handleSaveSubmission = async (sub: DailySubmission) => {
    const res = await storage.saveSubmission(sub);
    reloadState();
    return res;
  };

  const handleUpdateSubmission = async (id: string, updates: Partial<DailySubmission>) => {
    await storage.updateSubmission(id, updates);
    reloadState();
  };

  const handleDeleteSubmission = async (id: string) => {
    await storage.deleteSubmission(id);
    reloadState();
  };

  // Backup & Restore
  const handleExportBackup = () => {
    return storage.exportAllDataAsBackup();
  };

  const handleImportBackup = async (jsonStr: string) => {
    const success = await storage.importBackupData(jsonStr);
    if (success) reloadState();
    return success;
  };

  const students = users.filter((u) => u.role === 'murid');
  const teachers = users.filter((u) => u.role === 'guru');

  // If not logged in -> Portal Login Modal (Only Guru & Admin, No Demo)
  if (!currentUser) {
    return (
      <LoginModal
        config={config}
        users={users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <MainLayout
      currentUser={currentUser}
      config={config}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {/* 1. Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardView
          config={config}
          students={students}
          attendances={attendances}
          onOpenScanner={() => setActiveTab('scanner')}
        />
      )}

      {/* 2. Data Kelas Tab */}
      {activeTab === 'kelas' && (
        <ClassDataView
          classes={classes}
          teachers={teachers}
          students={students}
          onSaveClasses={handleSaveClasses}
          onUpdateClass={handleUpdateClass}
        />
      )}

      {/* 3. Data Siswa Tab */}
      {activeTab === 'siswa' && (
        <StudentDataView
          students={students}
          classes={classes}
          config={config}
          onSaveStudent={handleSaveUser}
          onDeleteStudent={handleDeleteUser}
          onUpdateStudent={handleUpdateUser}
        />
      )}

      {/* 4. Absen Manual Tab */}
      {activeTab === 'manual' && (
        <ManualAttendanceView
          students={students}
          classes={classes}
          attendances={attendances}
          onProcessAttendance={handleProcessAttendance}
        />
      )}

      {/* 5. Scan Barcode / Wajah Tab (Hands-Free Auto-Detect) */}
      {activeTab === 'scanner' && (
        <AttendanceScannerView
          config={config}
          students={students}
          attendances={attendances}
          onProcessAttendance={handleProcessAttendance}
          onBackToDashboard={() => setActiveTab('dashboard')}
        />
      )}

      {/* 6. Rekap Absensi Tab */}
      {activeTab === 'rekap' && (
        <TeacherDashboardView
          currentUser={currentUser}
          config={config}
          classes={classes}
          users={users}
          attendances={attendances}
          allAttendancesIncludingHidden={storage.getAllAttendancesIncludingHidden()}
          submissions={submissions}
          onUpdateSubmission={handleUpdateSubmission}
          onSoftClearRecap={handleSoftClearRecap}
          onRestoreRecap={handleRestoreRecap}
          onMarkParentNotified={handleMarkParentNotified}
          onDeleteAttendance={handleDeleteAttendance}
          onOpenPdfReport={() => setShowPdfModal(true)}
        />
      )}

      {/* 7. Rekap Setoran Tab (Tahfidz, Tugas & Ibadah) */}
      {activeTab === 'setoran' && (
        <DailySubmissionsRecapView
          submissions={submissions}
          students={students}
          classes={classes}
          currentUser={currentUser}
          onSaveSubmission={handleSaveSubmission}
          onUpdateSubmission={handleUpdateSubmission}
          onDeleteSubmission={handleDeleteSubmission}
        />
      )}

      {/* 8. Pengaturan Tab */}
      {activeTab === 'pengaturan' && (
        <AdminSettingsView
          config={config}
          users={users}
          classes={classes}
          onUpdateConfig={handleUpdateConfig}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
          onSaveClasses={handleSaveClasses}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      )}

      {/* PDF Report Print Modal */}
      {showPdfModal && (
        <PdfReportModal
          config={config}
          attendances={attendances}
          classes={classes}
          users={users}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </MainLayout>
  );
}
