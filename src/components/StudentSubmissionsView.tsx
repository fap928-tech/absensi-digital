import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  PlusCircle,
  HeartHandshake,
  FileText,
  Flame,
  Send,
  Sparkles
} from 'lucide-react';
import { UserProfile, DailySubmission, SubmissionType } from '../types';
import { soundFx } from '../utils/audio';

interface StudentSubmissionsViewProps {
  currentUser: UserProfile;
  submissions: DailySubmission[];
  onAddSubmission: (sub: DailySubmission) => Promise<void>;
}

export const StudentSubmissionsView: React.FC<StudentSubmissionsViewProps> = ({
  currentUser,
  submissions,
  onAddSubmission
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<SubmissionType>('tahfidz');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filter submissions for current student
  const studentSubs = submissions.filter((s) => s.studentId === currentUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !details.trim()) return;

    setIsSubmitting(true);
    try {
      const newSub: DailySubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentId: currentUser.id,
        studentName: currentUser.name,
        className: currentUser.className || 'X MIPA 1',
        date: new Date().toISOString().split('T')[0],
        type,
        title: title.trim(),
        details: details.trim(),
        status: 'menunggu_verifikasi',
        createdAt: new Date().toISOString()
      };

      await onAddSubmission(newSub);
      soundFx.playSuccess();
      setNotice('Setoran harian berhasil dikirim ke guru kelas untuk diverifikasi!');
      setTitle('');
      setDetails('');
      setShowAddForm(false);
    } catch {
      soundFx.playAlert();
      setNotice('Gagal mengirim setoran. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (t: SubmissionType) => {
    switch (t) {
      case 'tahfidz':
        return { label: 'Tahfidz Al-Qur’an', icon: BookOpen, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'tugas':
        return { label: 'Tugas / PR Belajar', icon: FileText, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      case 'ibadah':
        return { label: 'Ibadah Harian', icon: Flame, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'literasi':
        return { label: 'Literasi Membaca', icon: BookOpen, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'kebiasaan_baik':
        return { label: 'Kebiasaan Baik', icon: HeartHandshake, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      default:
        return { label: 'Setoran', icon: BookOpen, color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1">
            <BookOpen className="w-4 h-4" />
            Buku Catatan Setoran Harian
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Setoran Belajar & Kebiasaan Baik
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kirimkan catatan hafalan tahfidz, ringkasan materi, atau kebaikan harian untuk dinilai oleh wali kelas.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setNotice(null);
          }}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          {showAddForm ? 'Tutup Form' : 'Tambah Setoran Baru'}
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold underline">Tutup</button>
        </div>
      )}

      {/* Form Tambah Setoran */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-md space-y-4 animate-in fade-in"
        >
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Formulir Setoran Harian Siswa
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Setoran
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SubmissionType)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="tahfidz">Tahfidz Al-Qur'an (Surat & Ayat)</option>
                <option value="tugas">Tugas / PR Mata Pelajaran</option>
                <option value="ibadah">Ibadah Harian / Shalat Sunnah</option>
                <option value="literasi">Literasi Membaca Buku / Artikel</option>
                <option value="kebiasaan_baik">Karakter & Kebiasaan Positif</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul / Topik Setoran
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="contoh: QS. An-Naba ayat 1-20 atau Ringkasan Biologi"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rincian Keterangan & Catatan Setoran
            </label>
            <textarea
              required
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tuliskan ayat yang dihafal, ringkasan materi, atau kebaikan yang telah dilakukan hari ini..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Mengirim...' : 'Kirim Setoran'}
            </button>
          </div>
        </form>
      )}

      {/* Riwayat Setoran */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Riwayat Setoran Saya ({studentSubs.length})
        </h3>

        {studentSubs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada catatan setoran harian.</p>
            <p className="text-xs mt-1">Klik tombol "Tambah Setoran Baru" di atas untuk mulai mencatat.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {studentSubs.map((sub) => {
              const meta = getTypeLabel(sub.type);
              const IconComp = meta.icon;

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${meta.color}`}>
                        <IconComp className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {sub.date}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {sub.status === 'disetujui' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Disetujui Guru
                      </span>
                    )}
                    {sub.status === 'menunggu_verifikasi' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 text-amber-600" /> Menunggu Verifikasi
                      </span>
                    )}
                    {sub.status === 'perlu_perbaikan' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> Perlu Perbaikan
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{sub.title}</h4>
                  <p className="text-xs text-slate-600 whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
                    {sub.details}
                  </p>

                  {/* Feedback from teacher if available */}
                  {sub.feedbackTeacher && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                      <strong className="block font-bold text-emerald-800 mb-0.5">
                        Catatan & Nilai Guru ({sub.teacherName || 'Wali Kelas'}):
                      </strong>
                      {sub.feedbackTeacher}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
