import React, { useState } from 'react';
import { UserProfile, SchoolClass, AttendanceRecord, AttendanceStatus } from '../types';
import { UserCheck, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ManualAttendanceViewProps {
  students: UserProfile[];
  classes: SchoolClass[];
  attendances: AttendanceRecord[];
  onProcessAttendance: (
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
    }
  ) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
}

export const ManualAttendanceView: React.FC<ManualAttendanceViewProps> = ({
  students,
  classes,
  attendances,
  onProcessAttendance
}) => {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.name || 'Semua');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [actionType, setActionType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [status, setStatus] = useState<AttendanceStatus>('hadir');
  const [customTime, setCustomTime] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
  );
  const [customDate, setCustomDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [resultNotice, setResultNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredStudents = students.filter(
    (s) => selectedClass === 'Semua' || s.className === selectedClass
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultNotice(null);

    const targetStudent = students.find((s) => s.id === selectedStudentId);
    if (!targetStudent) {
      soundFx.playAlert();
      setResultNotice({ type: 'error', message: 'Silakan pilih siswa terlebih dahulu!' });
      return;
    }

    const res = await onProcessAttendance(targetStudent.id, actionType, {
      studentName: targetStudent.name,
      className: targetStudent.className || 'X IPA 1',
      timeStr: `${customTime}:00`,
      dateStr: customDate,
      status,
      method: 'manual_teacher'
    });

    if (res.success) {
      soundFx.playSuccess();
      setResultNotice({ type: 'success', message: res.message });
      setNotes('');
    } else {
      soundFx.playAlert();
      setResultNotice({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          Absen Manual Siswa
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pencatatan presensi manual oleh wali kelas jika murid berhalangan, izin, sakit, atau kendala perangkat.
        </p>
      </div>

      {resultNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in ${
            resultNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {resultNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{resultNotice.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Filter Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Siswa</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
            >
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Aksi Presensi</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActionType('clock_in')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  actionType === 'clock_in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Clock In
              </button>
              <button
                type="button"
                onClick={() => setActionType('clock_out')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  actionType === 'clock_out' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Clock Out
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kehadiran</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            >
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa (Tidak Hadir)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Presensi</label>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Alasan</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="contoh: Sakit demam berdarah / Surat dokter terlampir"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          Simpan Presensi Manual
        </button>
      </form>
    </div>
  );
};
