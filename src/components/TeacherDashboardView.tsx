import React, { useState } from 'react';
import {
  Users,
  Calendar,
  AlertTriangle,
  MessageCircle,
  EyeOff,
  Eye,
  FileDown,
  QrCode,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Check,
  RotateCcw,
  BookOpen,
  Trash2
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  UserProfile,
  SchoolConfig,
  AttendanceRecord,
  DailySubmission,
  SchoolClass
} from '../types';
import { formatDistance } from '../utils/geo';
import { soundFx } from '../utils/audio';

interface TeacherDashboardViewProps {
  currentUser: UserProfile;
  config: SchoolConfig;
  classes: SchoolClass[];
  users: UserProfile[];
  attendances: AttendanceRecord[];
  allAttendancesIncludingHidden: AttendanceRecord[];
  submissions?: DailySubmission[];
  onSoftClearRecap: (date?: string, className?: string) => Promise<number>;
  onRestoreRecap: (date?: string) => Promise<number>;
  onMarkParentNotified: (recordId: string) => Promise<void>;
  onDeleteAttendance?: (recordId: string) => Promise<void>;
  onUpdateSubmission?: (subId: string, updates: Partial<DailySubmission>) => Promise<void>;
  onOpenPdfReport: () => void;
  onOpenDynamicQr?: () => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  currentUser,
  config,
  classes,
  users,
  attendances,
  allAttendancesIncludingHidden,
  submissions = [],
  onSoftClearRecap,
  onRestoreRecap,
  onMarkParentNotified,
  onDeleteAttendance,
  onUpdateSubmission,
  onOpenPdfReport,
  onOpenDynamicQr
}) => {
  const [activeTab, setActiveTab] = useState<'harian' | 'setoran' | 'mencurigakan'>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    currentUser.className || classes[0]?.name || 'Semua'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mode Audit: Lihat jejak rekap yang disembunyikan
  const [showHiddenAuditMode, setShowHiddenAuditMode] = useState<boolean>(false);
  const [auditPinPrompt, setAuditPinPrompt] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Soft clear confirmation modal & delete attendance modal
  const [showSoftClearConfirmModal, setShowSoftClearConfirmModal] = useState<boolean>(false);
  const [deletingAttendance, setDeletingAttendance] = useState<AttendanceRecord | null>(null);

  // Submission feedback modal state
  const [selectedSubForReview, setSelectedSubForReview] = useState<DailySubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');

  // Photo modal preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // All student profiles
  const studentProfiles = users.filter((u) => u.role === 'murid');

  // Active attendance records based on Audit Mode
  const activeRecordList = showHiddenAuditMode
    ? allAttendancesIncludingHidden
    : attendances;

  // Filter records by date and class
  const filteredAttendances = activeRecordList.filter((att) => {
    if (att.date !== selectedDate) return false;
    if (selectedClass !== 'Semua' && att.className !== selectedClass) return false;
    if (searchQuery && !att.studentName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate quick stats
  const totalStudentsInClass = studentProfiles.filter(
    (s) => selectedClass === 'Semua' || s.className === selectedClass
  ).length;

  const hadirCount = filteredAttendances.filter((a) => a.status === 'hadir').length;
  const terlambatCount = filteredAttendances.filter((a) => a.status === 'terlambat').length;
  const mencurigakanCount = filteredAttendances.filter((a) => a.status === 'mencurigakan').length;
  const belumAbsenCount = Math.max(
    0,
    totalStudentsInClass - (hadirCount + terlambatCount + mencurigakanCount)
  );

  // Suspicious & Absent records for WhatsApp Notification to Parents
  const suspiciousOrAbsentRecords = filteredAttendances.filter(
    (a) => a.status === 'mencurigakan' || a.status === 'terlambat'
  );

  // Students who have not checked in today
  const absentStudents = studentProfiles
    .filter((s) => selectedClass === 'Semua' || s.className === selectedClass)
    .filter((s) => !filteredAttendances.some((a) => a.studentId === s.id));

  // "Hapus Jejak Rekap Absensi tapi Data nya Masih Ada"
  const handleExecuteSoftClearRecap = async () => {
    const count = await onSoftClearRecap(
      selectedDate,
      selectedClass === 'Semua' ? undefined : selectedClass
    );
    soundFx.playSuccess();
    setShowSoftClearConfirmModal(false);
    setActionNotice(
      `Jejak rekap berhasil dibersihkan (${count} data disembunyikan dari layar publik). Data tetap tersimpan aman di database cloud dan dapat dibuka melalui Mode Audit.`
    );
  };

  // Restore Hidden Trace
  const handleRestoreTrace = async () => {
    const count = await onRestoreRecap(selectedDate);
    soundFx.playSuccess();
    setActionNotice(`${count} rekaman absensi berhasil dipulihkan ke tampilan rekap utama.`);
  };

  // Open Audit Mode with PIN
  const handleVerifyAuditPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === '1234' || enteredPin === config.adminPassword) {
      soundFx.playSuccess();
      setShowHiddenAuditMode(true);
      setAuditPinPrompt(false);
      setEnteredPin('');
      setActionNotice('Mode Audit Terbuka: Menampilkan seluruh rekaman termasuk jejak tersembunyi.');
    } else {
      soundFx.playAlert();
      setActionNotice('PIN / Kata Sandi Audit salah! (PIN Standar: 1234)');
    }
  };

  // Generate automated WhatsApp link to parent
  const sendWhatsAppNotification = (
    studentName: string,
    parentPhone: string | undefined,
    parentName: string | undefined,
    reason: string,
    recordId?: string
  ) => {
    if (!parentPhone) {
      soundFx.playAlert();
      setActionNotice(`Nomor WhatsApp orang tua untuk ${studentName} belum tercatat di data siswa.`);
      return;
    }

    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : `62${cleanPhone}`;

    const dateFormatted = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const message = `*NOTIFIKASI RESMI KEHADIRAN SISWA*\n*${config.schoolName}*\n\n` +
      `Yth. Bapak/Ibu ${parentName || 'Orang Tua/Wali'},\n\n` +
      `Kami menginformasikan perkembangan kehadiran ananda:\n` +
      `• *Nama Siswa:* ${studentName}\n` +
      `• *Kelas:* ${selectedClass}\n` +
      `• *Hari/Tanggal:* ${dateFormatted}\n` +
      `• *Status Kehadiran:* ${reason}\n\n` +
      `Pesan ini dikirim secara otomatis oleh Sistem Presensi Cerdas ${config.schoolName}. Mohon konfirmasi apabila ananda berhalangan atau sakit.\n\n` +
      `Terima kasih atas perhatian dan kerja sama Bapak/Ibu.\n` +
      `_Wali Kelas & Bagian Kesiswaan_`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encoded}`;

    if (recordId) {
      onMarkParentNotified(recordId);
    }
    soundFx.playSuccess();
    window.open(waUrl, '_blank');
  };

  // Handle Review Submission
  const handleSaveSubReview = async (status: 'disetujui' | 'perlu_perbaikan') => {
    if (!selectedSubForReview) return;
    if (onUpdateSubmission) {
      await onUpdateSubmission(selectedSubForReview.id, {
        status,
        feedbackTeacher: feedbackText.trim() || undefined,
        teacherName: currentUser.name
      });
    }
    soundFx.playSuccess();
    setSelectedSubForReview(null);
    setFeedbackText('');
    setActionNotice('Verifikasi setoran siswa berhasil disimpan.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-4 max-w-md w-full overflow-hidden shadow-2xl">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Bukti Foto Biometrik Siswa</h4>
            <div className="rounded-2xl overflow-hidden aspect-4/3 bg-black">
              <img src={previewPhoto} alt="Bukti Presensi" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              Tutup Foto
            </button>
          </div>
        </div>
      )}

      {/* Audit Pin Prompt Modal */}
      {auditPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleVerifyAuditPin}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              Buka Arsip Jejak Tersembunyi
            </h4>
            <p className="text-xs text-slate-500">
              Masukkan PIN Audit atau Kata Sandi Admin untuk melihat riwayat absensi yang disembunyikan.
            </p>
            <input
              type="password"
              autoFocus
              required
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="Masukkan PIN (Standar: 1234)..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAuditPinPrompt(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Buka Arsip
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submission Review Modal */}
      {selectedSubForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Verifikasi & Nilai Setoran Siswa
            </h4>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400 font-semibold">Siswa:</span>{' '}
                <strong className="text-slate-800">{selectedSubForReview.studentName}</strong> ({selectedSubForReview.className})
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Judul:</span>{' '}
                <span className="font-semibold text-indigo-700">{selectedSubForReview.title}</span>
              </div>
              <div className="mt-2 text-slate-600 bg-white p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                {selectedSubForReview.details}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Umpan Balik / Catatan Guru
              </label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tuliskan catatan apresiasi, nilai hafalan, atau perbaikan..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForReview(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveSubReview('perlu_perbaikan')}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Perlu Perbaikan
              </button>
              <button
                type="button"
                onClick={() => handleSaveSubReview('disetujui')}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Setujui Setoran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1">
            <Users className="w-4 h-4" />
            Panel Guru & Wali Kelas
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Monitoring & Rekap Presensi Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau kehadiran real-time, verifikasi bukti foto GPS, setoran harian, dan notifikasi orang tua.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenDynamicQr}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            Tampilkan QR Proyektor Kelas
          </button>

          <button
            onClick={onOpenPdfReport}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Ekspor Laporan PDF
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold underline ml-2">
            Tutup
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hadir Tepat Waktu</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{hadirCount}</span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Terlambat</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{terlambatCount}</span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mencurigakan / Luar GPS</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600">{mencurigakanCount}</span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Belum Presensi (Alpa)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-700">{belumAbsenCount}</span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
        </div>
      </div>

      {/* Filter & Subtabs Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Sub Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('harian')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'harian'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Presensi Harian ({filteredAttendances.length})
            </button>
            <button
              onClick={() => setActiveTab('mencurigakan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'mencurigakan'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Perhatian & WA Ortu ({suspiciousOrAbsentRecords.length + absentStudents.length})
            </button>
            <button
              onClick={() => setActiveTab('setoran')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'setoran'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Setoran Harian Siswa ({submissions.length})
            </button>
          </div>

          {/* Audit Trace Buttons: Specific requirement "hapus jejak rekap absensi tapi datanya masih ada" */}
          <div className="flex items-center gap-2">
            {!showHiddenAuditMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowSoftClearConfirmModal(true)}
                  title="Hapus jejak rekap dari layar publik (data tetap aman di database cloud)"
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Hapus Jejak Rekap Absensi
                </button>
                <button
                  type="button"
                  onClick={() => setAuditPinPrompt(true)}
                  title="Buka seluruh rekaman termasuk jejak yang disembunyikan"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Mode Audit
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Mode Audit Aktif
                </span>
                <button
                  type="button"
                  onClick={handleRestoreTrace}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Pulihkan Jejak
                </button>
                <button
                  type="button"
                  onClick={() => setShowHiddenAuditMode(false)}
                  className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                >
                  Tutup Audit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date, Class, and Search Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Tanggal Presensi
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Pilih Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="Semua">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Cari Nama Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama siswa..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: REKAP PRESENSI HARIAN TABLE */}
      {activeTab === 'harian' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">Jam Masuk</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Jarak GPS</th>
                  <th className="py-3.5 px-4">Bukti Foto</th>
                  <th className="py-3.5 px-4">Setoran Siswa (Terhubung)</th>
                  <th className="py-3.5 px-4 text-right">Aksi & WA Ortu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Tidak ada data presensi pada tanggal {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  filteredAttendances.map((att) => {
                    const studentUser = studentProfiles.find((s) => s.id === att.studentId);
                    const studentSubs = submissions.filter(
                      (s) =>
                        s.studentId === att.studentId ||
                        s.studentName.toLowerCase().trim() === att.studentName.toLowerCase().trim()
                    );
                    const todaySub = studentSubs.find((s) => s.date === att.date) || studentSubs[0];

                    return (
                      <tr
                        key={att.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          att.isHiddenFromRecap ? 'bg-amber-50/40 opacity-75' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{att.studentName}</span>
                            {att.isHiddenFromRecap && (
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-sm font-normal">
                                Tersembunyi (Audit)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{att.className}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {att.checkInTime} WIB
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              att.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {att.status === 'mencurigakan' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                            {att.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {formatDistance(att.distanceMeters ?? 0)}{' '}
                            <span className={att.inRadius ? 'text-emerald-600' : 'text-red-500 font-bold'}>
                              ({att.inRadius ? 'Aman' : 'Luar Batas'})
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {att.photoProof ? (
                            <button
                              onClick={() => setPreviewPhoto(att.photoProof || null)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer"
                            >
                              <img
                                src={att.photoProof}
                                alt="Foto"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {todaySub ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubForReview(todaySub);
                                setFeedbackText(todaySub.feedbackTeacher || '');
                              }}
                              className="text-left group cursor-pointer"
                              title="Klik untuk melihat detail & menilai setoran siswa ini"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    todaySub.status === 'disetujui'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : todaySub.status === 'menunggu_verifikasi'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {todaySub.type === 'tahfidz' ? 'Tahfidz' : todaySub.type === 'tugas' ? 'Tugas' : 'Ibadah'}
                                </span>
                                <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-xs truncate max-w-[140px]">
                                  {todaySub.title}
                                </span>
                              </div>
                              {todaySub.feedbackTeacher && (
                                <div className="text-[10px] text-emerald-700 italic truncate max-w-[160px] mt-0.5">
                                  "{todaySub.feedbackTeacher}"
                                </div>
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Belum ada setoran</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                sendWhatsAppNotification(
                                  att.studentName,
                                  studentUser?.parentPhone,
                                  studentUser?.parentName,
                                  `Tercatat ${att.status.toUpperCase()} (${att.checkInTime} WIB)${
                                    att.suspiciousReason ? ` - ${att.suspiciousReason}` : ''
                                  }`,
                                  att.id
                                )
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                att.parentNotifiedWA
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              {att.parentNotifiedWA ? 'Terkirim (Kirim Ulang)' : 'Kirim WA Ortu'}
                            </button>
                            {onDeleteAttendance && (
                              <button
                                type="button"
                                onClick={() => setDeletingAttendance(att)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Data Presensi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PERHATIAN & SISWA ALPA / MENCURIGAKAN */}
      {activeTab === 'mencurigakan' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Fitur Notifikasi Otomatis Orang Tua Siswa:</strong>
              Daftar siswa di bawah ini membutuhkan perhatian (belum hadir / terlambat / presensi di luar radius sekolah). Anda dapat langsung mengklik tombol WhatsApp untuk mengirimkan laporan resmi ke nomor orang tua siswa yang terdaftar.
            </div>
          </div>

          {/* 1. Belum Hadir (Alpa) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Siswa Belum Presensi / Alpa Hari Ini ({absentStudents.length})
            </h3>

            {absentStudents.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium py-2">
                Alhamdulillah! Semua siswa kelas ini sudah melakukan presensi.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {absentStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">
                        NISN: {s.nisn} • Wali: {s.parentName || 'Orang Tua'} ({s.parentPhone || 'No WA belum ada'})
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        sendWhatsAppNotification(
                          s.name,
                          s.parentPhone,
                          s.parentName,
                          'TIDAK HADIR / BELUM MELAKUKAN PRESENSI HINGGA SAAT INI'
                        )
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WA Ortu
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Terlambat atau Mencurigakan */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Siswa Terlambat & Presensi Di Luar Batas Sekolah ({suspiciousOrAbsentRecords.length})
            </h3>

            {suspiciousOrAbsentRecords.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Tidak ada siswa terlambat atau presensi mencurigakan pada tanggal ini.
              </p>
            ) : (
              <div className="space-y-2">
                {suspiciousOrAbsentRecords.map((att) => {
                  const studentUser = studentProfiles.find((s) => s.id === att.studentId);

                  return (
                    <div
                      key={att.id}
                      className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{att.studentName}</span>
                          <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full font-semibold">
                            {att.status.toUpperCase()} ({att.checkInTime} WIB)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {att.suspiciousReason || `Jarak: ${formatDistance(att.distanceMeters ?? 0)}`}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          sendWhatsAppNotification(
                            att.studentName,
                            studentUser?.parentPhone,
                            studentUser?.parentName,
                            `Tercatat ${att.status.toUpperCase()} (${att.checkInTime} WIB) - ${
                              att.suspiciousReason || 'Keterangan sistem'
                            }`,
                            att.id
                          )
                        }
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Kirim WA
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: VERIFIKASI SETORAN HARIAN SISWA */}
      {activeTab === 'setoran' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Daftar Setoran Belajar & Karakter Siswa
          </h3>

          {submissions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Belum ada setoran harian yang dikirim oleh siswa.
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const attOnDate = attendances.find(
                  (a) =>
                    (a.studentId === sub.studentId ||
                      a.studentName.toLowerCase().trim() === sub.studentName.toLowerCase().trim()) &&
                    a.date === sub.date
                );

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{sub.studentName}</span>
                        <span className="text-xs text-slate-500">({sub.className}) • {sub.date}</span>
                        {attOnDate ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              attOnDate.status === 'hadir'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            Presensi: {attOnDate.status.toUpperCase()} ({attOnDate.checkInTime} WIB)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Presensi: Belum Absen
                          </span>
                        )}
                      </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sub.status === 'disetujui'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'menunggu_verifikasi'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sub.status === 'disetujui'
                          ? 'Disetujui'
                          : sub.status === 'menunggu_verifikasi'
                          ? 'Menunggu Nilai'
                          : 'Perlu Perbaikan'}
                      </span>

                      <button
                        onClick={() => {
                          setSelectedSubForReview(sub);
                          setFeedbackText(sub.feedbackTeacher || '');
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                      >
                        Nilai Setoran
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-indigo-900">{sub.title}</h4>
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                    {sub.details}
                  </p>
                  {sub.feedbackTeacher && (
                    <div className="text-[11px] text-emerald-700 italic">
                      Catatan Guru: "{sub.feedbackTeacher}"
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* CONFIRM SOFT CLEAR RECAP TRACE MODAL ("Hapus Jejak Rekap Absensi tapi Data Masih Ada") */}
      <ConfirmDeleteModal
        isOpen={showSoftClearConfirmModal}
        title="Hapus Jejak Rekap Absensi"
        message="Jejak rekap absensi pada tanggal dan kelas yang dipilih akan dibersihkan dari tampilan publik, namun seluruh data tetap TERSIMPAN AMAN di database cloud audit sekolah dan dapat dibuka kapan saja melalui Mode Audit."
        confirmButtonText="Bersihkan Jejak Tampilan"
        onCancel={() => setShowSoftClearConfirmModal(false)}
        onConfirm={handleExecuteSoftClearRecap}
      />

      {/* CONFIRM DELETE ATTENDANCE RECORD MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingAttendance}
        title="Hapus Rekaman Presensi"
        message="Apakah Anda yakin ingin menghapus data presensi siswa ini secara permanen?"
        itemName={
          deletingAttendance
            ? `${deletingAttendance.studentName} (${deletingAttendance.className}) • ${deletingAttendance.date} ${deletingAttendance.checkInTime} WIB`
            : undefined
        }
        onCancel={() => setDeletingAttendance(null)}
        onConfirm={async () => {
          if (deletingAttendance && onDeleteAttendance) {
            await onDeleteAttendance(deletingAttendance.id);
            soundFx.playSuccess();
            setDeletingAttendance(null);
            setActionNotice(`Data presensi ${deletingAttendance.studentName} berhasil dihapus.`);
          }
        }}
      />
    </div>
  );
};
