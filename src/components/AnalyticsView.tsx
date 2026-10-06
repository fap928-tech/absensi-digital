import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  PieChart,
  School,
  ArrowUpRight
} from 'lucide-react';
import { AttendanceRecord, SchoolClass, UserProfile } from '../types';

interface AnalyticsViewProps {
  attendances: AttendanceRecord[];
  classes: SchoolClass[];
  users: UserProfile[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  attendances,
  classes,
  users
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // 'YYYY-MM'
  );
  const [selectedClass, setSelectedClass] = useState<string>('Semua');

  const students = users.filter((u) => u.role === 'murid');

  // Filter records by month
  const monthlyAttendances = attendances.filter((a) => {
    if (!a.date.startsWith(selectedMonth)) return false;
    if (selectedClass !== 'Semua' && a.className !== selectedClass) return false;
    return true;
  });

  const totalLogs = monthlyAttendances.length;
  const hadirCount = monthlyAttendances.filter((a) => a.status === 'hadir').length;
  const terlambatCount = monthlyAttendances.filter((a) => a.status === 'terlambat').length;
  const mencurigakanCount = monthlyAttendances.filter((a) => a.status === 'mencurigakan').length;

  const attendanceRate = totalLogs > 0 ? Math.round(((hadirCount + terlambatCount) / totalLogs) * 100) : 100;
  const punctualityRate = totalLogs > 0 ? Math.round((hadirCount / totalLogs) * 100) : 100;

  // Class by class comparison
  const classStats = classes.map((cls) => {
    const classLogs = attendances.filter(
      (a) => a.date.startsWith(selectedMonth) && a.className === cls.name
    );
    const totalClassStudents = students.filter((s) => s.className === cls.name).length;
    const classHadir = classLogs.filter((a) => a.status === 'hadir').length;
    const classTerlambat = classLogs.filter((a) => a.status === 'terlambat').length;
    const rate = classLogs.length > 0 ? Math.round((classHadir / classLogs.length) * 100) : 0;

    return {
      className: cls.name,
      teacher: cls.homeroomTeacher,
      totalStudents: totalClassStudents,
      logsCount: classLogs.length,
      hadir: classHadir,
      terlambat: classTerlambat,
      punctualityRate: rate
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            Dashboard Analitik Kehadiran Real-Time
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Statistik Performa & Disiplin Belajar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Evaluasi berkala tingkat ketepatan waktu, persentase kehadiran per kelas, dan deteksi anomali.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="Semua">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Tingkat Hadir</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">{attendanceRate}%</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Total {totalLogs} presensi
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Ketepatan Waktu</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">{punctualityRate}%</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {hadirCount} tepat waktu vs {terlambatCount} terlambat
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Presensi Terlambat</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-amber-600">{terlambatCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Tercatat melewati 07:15 WIB</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Luar Radius GPS</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-rose-600">{mencurigakanCount}</div>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Anomali terdeteksi</p>
        </div>
      </div>

      {/* Class Comparison Chart Bars */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Peringkat Ketepatan Waktu & Kehadiran per Kelas ({selectedMonth})
          </h3>
          <span className="text-xs text-slate-400 font-mono">Berdasarkan data cloud</span>
        </div>

        <div className="space-y-4">
          {classStats.map((cs) => (
            <div key={cs.className} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <strong className="text-slate-900 font-bold">{cs.className}</strong>
                  <span className="text-slate-500 ml-2">Wali: {cs.teacher}</span>
                </div>
                <div className="font-mono font-bold text-indigo-600">
                  {cs.punctualityRate}% Tepat Waktu ({cs.hadir} Hadir / {cs.terlambat} Terlambat)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                <div
                  style={{ width: `${cs.punctualityRate}%` }}
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
