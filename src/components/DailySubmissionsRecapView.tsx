import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  Trash2,
  FileText,
  Flame,
  HeartHandshake
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { DailySubmission, UserProfile, SchoolClass, SubmissionType } from '../types';
import { soundFx } from '../utils/audio';

interface DailySubmissionsRecapViewProps {
  submissions: DailySubmission[];
  students: UserProfile[];
  classes: SchoolClass[];
  currentUser: UserProfile;
  onSaveSubmission: (sub: DailySubmission) => Promise<DailySubmission>;
  onUpdateSubmission: (id: string, updates: Partial<DailySubmission>) => Promise<void>;
  onDeleteSubmission: (id: string) => Promise<void>;
}

export const DailySubmissionsRecapView: React.FC<DailySubmissionsRecapViewProps> = ({
  submissions,
  students,
  classes,
  currentUser,
  onSaveSubmission,
  onUpdateSubmission,
  onDeleteSubmission
}) => {
  const [filterClass, setFilterClass] = useState('Semua');
  const [filterType, setFilterType] = useState('Semua');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingSubmission, setDeletingSubmission] = useState<DailySubmission | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [type, setType] = useState<SubmissionType>('tahfidz');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [feedback, setFeedback] = useState('Mumtaz! Hafalan lancar dan tajwid tartil.');
  const [status, setStatus] = useState<'disetujui' | 'perlu_perbaikan' | 'menunggu_verifikasi'>('disetujui');

  const filtered = submissions.filter((s) => {
    if (filterClass !== 'Semua' && s.className !== filterClass) return false;
    if (filterType !== 'Semua' && s.type !== filterType) return false;
    if (search && !s.studentName.toLowerCase().includes(search.toLowerCase()) && !s.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === selectedStudentId);
    if (!st || !title.trim()) return;

    const newSub: DailySubmission = {
      id: `sub_${Date.now()}`,
      studentId: st.id,
      studentName: st.name,
      className: st.className || 'X IPA 1',
      date: new Date().toISOString().split('T')[0],
      type,
      title: title.trim(),
      details: details.trim(),
      status,
      feedbackTeacher: feedback.trim() || undefined,
      teacherName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    await onSaveSubmission(newSub);
    soundFx.playSuccess();
    setTitle('');
    setDetails('');
    setShowAddModal(false);
  };

  const sendWhatsAppReport = (sub: DailySubmission) => {
    const student = students.find((s) => s.id === sub.studentId);
    if (!student?.parentPhone) {
      soundFx.playAlert();
      setNotice(`Nomor WhatsApp orang tua untuk ${sub.studentName} belum tercatat.`);
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const clean = student.parentPhone.replace(/[^0-9]/g, '');
    const phone = clean.startsWith('0') ? `62${clean.slice(1)}` : clean.startsWith('62') ? clean : `62${clean}`;

    const text =
      `*LAPORAN SETORAN HARIAN SISWA*\n` +
      `*SMA SAINS TAHFIDZ ISLAMIC CENTER*\n\n` +
      `Yth. Bapak/Ibu ${student.parentName || 'Orang Tua'},\n\n` +
      `Alhamdulillah, ananda *${sub.studentName}* (Kelas ${sub.className}) telah menyetorkan:\n` +
      `• *Kategori:* ${sub.type.toUpperCase()}\n` +
      `• *Materi/Surat:* ${sub.title}\n` +
      `• *Hasil Penilaian:* ${sub.status === 'disetujui' ? 'LANCAR / MUTQIN (DISETUJUI)' : 'PERLU PERBAIKAN'}\n` +
      `• *Catatan Ustadz/Guru:* ${sub.feedbackTeacher || '-'}\n\n` +
      `Terima kasih atas bimbingan dan doa Bapak/Ibu di rumah.\n_Wali Kelas & Pembimbing Tahfidz_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    soundFx.playSuccess();
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between animate-in fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold underline ml-2 cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Rekap Setoran Harian (Tahfidz, Tugas & Ibadah)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan hafalan Al-Qur'an, tugas mata pelajaran, dan laporan ibadah siswa beserta notifikasi WhatsApp orang tua.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Input Setoran Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa atau surat/tugas..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="Semua">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="Semua">Semua Kategori</option>
          <option value="tahfidz">Tahfidz Al-Qur'an</option>
          <option value="tugas">Tugas Belajar</option>
          <option value="ibadah">Ibadah Shalat</option>
          <option value="kebiasaan_baik">Karakter / Kebaikan</option>
        </select>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Tanggal</th>
                <th className="py-3.5 px-6">Nama Siswa</th>
                <th className="py-3.5 px-6">Kategori</th>
                <th className="py-3.5 px-6">Materi / Judul</th>
                <th className="py-3.5 px-6">Status & Catatan Guru</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Belum ada rekaman setoran untuk kriteria ini.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-slate-500 whitespace-nowrap">{sub.date}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      <div>{sub.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{sub.className}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                        {sub.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-800">{sub.title}</div>
                      {sub.details && <div className="text-[11px] text-slate-500 mt-0.5">{sub.details}</div>}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'disetujui'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'perlu_perbaikan'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.status === 'disetujui' ? '✓ Disetujui' : 'Perlu Ulang'}
                      </span>
                      {sub.feedbackTeacher && (
                        <div className="text-[11px] text-emerald-700 italic mt-1">
                          "{sub.feedbackTeacher}"
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => sendWhatsAppReport(sub)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Kirim Laporan ke WA Orang Tua"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Kirim WA
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSubmission(sub)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus Catatan Setoran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAdd}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-slate-900">Input Setoran Harian Siswa</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Siswa</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.className})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SubmissionType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="tahfidz">Tahfidz Al-Qur'an</option>
                  <option value="tugas">Tugas Belajar</option>
                  <option value="ibadah">Ibadah Shalat</option>
                  <option value="kebiasaan_baik">Karakter / Kebaikan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Penilaian</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-emerald-700"
                >
                  <option value="disetujui">Lancar / Mutqin (Disetujui)</option>
                  <option value="perlu_perbaikan">Perlu Mengulang / Perbaikan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul / Surat & Ayat</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="contoh: QS. Al-Mulk Ayat 1 - 15"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tajwid / Keterangan</label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="contoh: Makhraj huruf tertib, panjang mad thobi'i tepat..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Umpan Balik Guru</label>
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-emerald-700 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Simpan Setoran
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingSubmission}
        title="Hapus Catatan Setoran"
        message="Apakah Anda yakin ingin menghapus catatan setoran harian ini dari sistem?"
        itemName={deletingSubmission ? `${deletingSubmission.studentName} (${deletingSubmission.className}) - ${deletingSubmission.title}` : undefined}
        onCancel={() => setDeletingSubmission(null)}
        onConfirm={async () => {
          if (deletingSubmission) {
            await onDeleteSubmission(deletingSubmission.id);
            soundFx.playSuccess();
            setDeletingSubmission(null);
          }
        }}
      />
    </div>
  );
};
