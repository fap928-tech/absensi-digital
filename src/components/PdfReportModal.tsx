import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  Calendar,
  CheckCircle,
  Download
} from 'lucide-react';
import { SchoolConfig, AttendanceRecord, SchoolClass, UserProfile } from '../types';
import { formatDistance } from '../utils/geo';

interface PdfReportModalProps {
  config: SchoolConfig;
  attendances: AttendanceRecord[];
  classes: SchoolClass[];
  users: UserProfile[];
  onClose: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  config,
  attendances,
  classes,
  users,
  onClose
}) => {
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClass, setSelectedClass] = useState<string>('Semua');

  const students = users.filter((u) => u.role === 'murid');

  const filteredLogs = attendances.filter((a) => {
    if (a.date !== reportDate) return false;
    if (selectedClass !== 'Semua' && a.className !== selectedClass) return false;
    return true;
  });

  const hadirCount = filteredLogs.filter((a) => a.status === 'hadir').length;
  const terlambatCount = filteredLogs.filter((a) => a.status === 'terlambat').length;
  const mencurigakanCount = filteredLogs.filter((a) => a.status === 'mencurigakan').length;

  const handlePrint = () => {
    window.print();
  };

  const homeroomTeacher =
    classes.find((c) => c.name === selectedClass)?.homeroomTeacher || 'Wali Kelas';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:rounded-none">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">Pratinjau Ekspor Laporan PDF Presensi</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg"
            />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg"
            >
              <option value="Semua">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 print:p-6 text-slate-900 bg-white print-page space-y-6">
          {/* KOP SURAT RESMI */}
          <div className="border-b-4 border-double border-slate-900 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                {config.schoolLogo && (
                  <img
                    src={config.schoolLogo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="text-center flex-1">
                <div className="text-xs uppercase font-bold tracking-widest text-slate-700">
                  PEMERINTAH PROVINSI • DINAS PENDIDIKAN
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-950 mt-0.5">
                  {config.schoolName}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {config.schoolAddress} • Telp: {config.phone}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Sistem Informasi Presensi Cerdas Berbasis Geolokasi & Biometrik
                </p>
              </div>
              <div className="w-20 shrink-0" />
            </div>
          </div>

          {/* REPORT TITLE */}
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold uppercase underline tracking-wider text-slate-950">
              LAPORAN REKAPITULASI KEHADIRAN SISWA
            </h2>
            <p className="text-xs text-slate-600">
              Periode: {new Date(reportDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}{' '}
              | Kelas: {selectedClass}
            </p>
          </div>

          {/* STATS SUMMARY BOX */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs border border-slate-300 rounded-xl p-3 bg-slate-50/50">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Presensi</span>
              <span className="font-bold text-sm text-slate-900">{filteredLogs.length} Siswa</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Hadir Tepat Waktu</span>
              <span className="font-bold text-sm text-emerald-700">{hadirCount} Siswa</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Terlambat</span>
              <span className="font-bold text-sm text-amber-700">{terlambatCount} Siswa</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Mencurigakan / Luar GPS</span>
              <span className="font-bold text-sm text-rose-700">{mencurigakanCount} Siswa</span>
            </div>
          </div>

          {/* ATTENDANCE DATA TABLE */}
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10px]">
                <th className="p-2 border border-slate-300 text-center w-8">No</th>
                <th className="p-2 border border-slate-300">Nama Siswa</th>
                <th className="p-2 border border-slate-300">Kelas</th>
                <th className="p-2 border border-slate-300 text-center">Jam Masuk</th>
                <th className="p-2 border border-slate-300 text-center">Metode</th>
                <th className="p-2 border border-slate-300 text-center">Radius GPS</th>
                <th className="p-2 border border-slate-300 text-center">Status</th>
                <th className="p-2 border border-slate-300">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    Tidak ada rekaman kehadiran untuk kriteria ini.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-mono">{index + 1}</td>
                    <td className="p-2 border border-slate-300 font-bold text-slate-900">
                      {log.studentName}
                    </td>
                    <td className="p-2 border border-slate-300">{log.className}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">
                      {log.checkInTime}
                    </td>
                    <td className="p-2 border border-slate-300 text-center">
                      {log.method === 'face_camera' ? 'Kamera Wajah' : 'QR Scan'}
                    </td>
                    <td className="p-2 border border-slate-300 text-center">
                      {formatDistance(log.distanceMeters ?? 0)}{' '}
                      <span className={log.inRadius ? 'text-emerald-700' : 'text-red-700 font-bold'}>
                        ({log.inRadius ? 'Sah' : 'Luar Radius'})
                      </span>
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold">
                      <span
                        className={
                          log.status === 'hadir'
                            ? 'text-emerald-700'
                            : log.status === 'terlambat'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-600">
                      {log.suspiciousReason || log.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* SIGNATURE SECTION */}
          <div className="pt-8 grid grid-cols-2 text-xs">
            <div className="text-center space-y-16">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900">Drs. H. Mulyadi, M.Pd.</p>
                <p className="text-slate-600">NIP. 197103151996031002</p>
              </div>
            </div>

            <div className="text-center space-y-16">
              <div>
                <p>Dicetak Pada: {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold">{selectedClass !== 'Semua' ? `Wali Kelas ${selectedClass}` : 'Koordinator Presensi'}</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900">{homeroomTeacher}</p>
                <p className="text-slate-600">NIP. Guru Pamong / Wali Kelas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
