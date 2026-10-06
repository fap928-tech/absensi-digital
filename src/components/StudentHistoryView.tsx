import React from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  AlertTriangle,
  History
} from 'lucide-react';
import { AttendanceRecord, UserProfile } from '../types';
import { formatDistance } from '../utils/geo';

interface StudentHistoryViewProps {
  currentUser: UserProfile;
  attendances: AttendanceRecord[];
}

export const StudentHistoryView: React.FC<StudentHistoryViewProps> = ({
  currentUser,
  attendances
}) => {
  const studentLogs = attendances.filter((a) => a.studentId === currentUser.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
          <History className="w-4 h-4" />
          Riwayat Presensi Pribadi
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Catatan Kehadiran {currentUser.name}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Semua catatan presensi harian yang telah tervalidasi di server cloud sekolah.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Jarak GPS</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Belum ada riwayat absensi yang tercatat.
                  </td>
                </tr>
              ) : (
                studentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{log.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {log.checkInTime} WIB
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          log.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'terlambat'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.method === 'face_camera' ? 'Kamera Wajah' : 'QR Scan'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {formatDistance(log.distanceMeters ?? 0)}{' '}
                        <span className={log.inRadius ? 'text-emerald-600' : 'text-red-500 font-bold'}>
                          ({log.inRadius ? 'Sah' : 'Luar Radius'})
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {log.suspiciousReason || log.notes || '-'}
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
