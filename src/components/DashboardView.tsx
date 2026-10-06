import React from 'react';
import {
  Users,
  CheckCircle2,
  LogOut,
  UserX,
  ArrowRight,
  Clock,
  Camera,
  QrCode
} from 'lucide-react';
import { AttendanceRecord, UserProfile, SchoolConfig } from '../types';

interface DashboardViewProps {
  config: SchoolConfig;
  students: UserProfile[];
  attendances: AttendanceRecord[];
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  attendances,
  onOpenScanner
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Today's attendance records
  const todayRecords = attendances.filter((a) => a.date === todayStr);

  const totalSiswa = students.length;
  const hadirHariIni = todayRecords.filter((a) => !!a.checkInTime).length;
  const clockOutPulang = todayRecords.filter((a) => !!a.checkOutTime).length;
  const belumAbsen = Math.max(0, totalSiswa - hadirHariIni);

  return (
    <div className="space-y-6">
      {/* 4 Top Stat Cards matching screenshot exactly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL SISWA */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              TOTAL SISWA
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {totalSiswa}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: HADIR HARI INI */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              HADIR HARI INI
            </div>
            <div className="text-3xl font-black text-emerald-600 mt-1">
              {hadirHariIni}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: CLOCK OUT PULANG */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              CLOCK OUT PULANG
            </div>
            <div className="text-3xl font-black text-amber-600 mt-1">
              {clockOutPulang}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <LogOut className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: BELUM ABSEN */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              BELUM ABSEN
            </div>
            <div className="text-3xl font-black text-rose-600 mt-1">
              {belumAbsen}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Card matching screenshot */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Aktivitas Presensi Hari Ini
          </h3>
          <button
            onClick={onOpenScanner}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            Buka Scanner <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-4 px-6 font-semibold">NAMA SISWA</th>
                <th className="py-4 px-6 font-semibold">KELAS</th>
                <th className="py-4 px-6 font-semibold">STATUS</th>
                <th className="py-4 px-6 font-semibold">WAKTU (CLOCK IN/OUT)</th>
                <th className="py-4 px-6 font-semibold">METODE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-slate-400 font-medium text-xs"
                  >
                    Belum ada aktivitas presensi hari ini.
                  </td>
                </tr>
              ) : (
                todayRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {rec.studentName}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 font-medium">
                      {rec.className}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'terlambat'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rec.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>In: {rec.checkInTime || '-'}</span>
                        <span className="text-slate-300">|</span>
                        <span>Out: {rec.checkOutTime || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 flex items-center gap-1.5">
                      {rec.method === 'face_camera' ? (
                        <>
                          <Camera className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Kamera Wajah</span>
                        </>
                      ) : rec.method === 'qr_code' ? (
                        <>
                          <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Scan QR</span>
                        </>
                      ) : (
                        <span>Manual Guru</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
