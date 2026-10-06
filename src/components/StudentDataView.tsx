import React, { useState } from 'react';
import { UserProfile, SchoolClass, SchoolConfig } from '../types';
import { Plus, Trash2, Edit3, Search, QrCode, Printer, X, Users, ShieldCheck, Check, Camera, Sparkles } from 'lucide-react';
import { generateStudentEncryptedQr, generateQrDataUrl } from '../utils/cryptoQr';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { PrecisionFaceCaptureModal } from './PrecisionFaceCaptureModal';
import { soundFx } from '../utils/audio';

interface StudentDataViewProps {
  students: UserProfile[];
  classes: SchoolClass[];
  config: SchoolConfig;
  onSaveStudent: (student: UserProfile) => Promise<UserProfile>;
  onDeleteStudent: (id: string) => Promise<void>;
  onUpdateStudent: (id: string, updates: Partial<UserProfile>) => Promise<UserProfile | null>;
}

export const StudentDataView: React.FC<StudentDataViewProps> = ({
  students,
  classes,
  config,
  onSaveStudent,
  onDeleteStudent,
  onUpdateStudent
}) => {
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('Semua');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [nisn, setNisn] = useState('');
  const [className, setClassName] = useState(classes[0]?.name || 'X IPA 1');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [faceDescriptor, setFaceDescriptor] = useState<number[]>([]);

  // Delete modal state
  const [deletingStudent, setDeletingStudent] = useState<UserProfile | null>(null);

  // Edit / Rename modal state
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editFaceDescriptor, setEditFaceDescriptor] = useState<number[]>([]);

  // Precision Face Camera Modal state
  const [showFaceCameraModal, setShowFaceCameraModal] = useState(false);
  const [faceCameraTarget, setFaceCameraTarget] = useState<'add' | 'edit'>('add');

  // QR Modal preview state
  const [qrModalStudent, setQrModalStudent] = useState<UserProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [rawToken, setRawToken] = useState<string>('');

  const filteredStudents = students.filter((s) => {
    if (filterClass !== 'Semua' && s.className !== filterClass) return false;
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.nisn?.includes(search)
    ) {
      return false;
    }
    return true;
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nisn.trim()) return;

    const id = `u_siswa_${Date.now()}`;
    const encryptedToken = generateStudentEncryptedQr(
      { id, nisn: nisn.trim(), name: name.trim(), className },
      config.qrSecuritySalt
    );

    const newStudent: UserProfile = {
      id,
      role: 'murid',
      name: name.trim(),
      username: nisn.trim(),
      nisn: nisn.trim(),
      className,
      parentName: parentName.trim() || undefined,
      parentPhone: parentPhone.trim() || undefined,
      photoUrl: photoUrl || undefined,
      faceDescriptor: faceDescriptor.length > 0 ? faceDescriptor : undefined,
      studentQrCode: encryptedToken
    };

    await onSaveStudent(newStudent);
    soundFx.playSuccess();
    setName('');
    setNisn('');
    setParentName('');
    setParentPhone('');
    setPhotoUrl('');
    setFaceDescriptor([]);
    setShowAddModal(false);
  };

  const openEditModal = (student: UserProfile) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditNisn(student.nisn || '');
    setEditClass(student.className || classes[0]?.name || 'X IPA 1');
    setEditParentName(student.parentName || '');
    setEditParentPhone(student.parentPhone || '');
    setEditPhotoUrl(student.photoUrl || '');
    setEditFaceDescriptor(student.faceDescriptor || []);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) return;

    await onUpdateStudent(editingStudent.id, {
      name: editName.trim(),
      nisn: editNisn.trim() || undefined,
      className: editClass,
      parentName: editParentName.trim() || undefined,
      parentPhone: editParentPhone.trim() || undefined,
      photoUrl: editPhotoUrl || undefined,
      faceDescriptor: editFaceDescriptor.length > 0 ? editFaceDescriptor : undefined
    });

    soundFx.playSuccess();
    setEditingStudent(null);
  };

  const handleOpenQrCard = async (student: UserProfile) => {
    setQrModalStudent(student);
    const encryptedToken =
      student.studentQrCode && student.studentQrCode.startsWith('PROPRIETARY-')
        ? student.studentQrCode
        : generateStudentEncryptedQr(
            { id: student.id, nisn: student.nisn, name: student.name, className: student.className },
            config.qrSecuritySalt
          );

    setRawToken(encryptedToken);

    try {
      const url = await generateQrDataUrl(encryptedToken, 320);
      setQrDataUrl(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Manajemen & Rename Data Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin dapat mengedit/mengubah nama, NISN, kelas, nomor kontak wali murid, dan mencetak kartu QR terenkripsi anti-Google Lens.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Siswa Baru
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
            placeholder="Cari nama atau NISN siswa..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="Semua">Semua Kelas ({students.length})</option>
          {classes.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Nama Siswa</th>
                <th className="py-3.5 px-6">NISN</th>
                <th className="py-3.5 px-6">Kelas</th>
                <th className="py-3.5 px-6">Orang Tua / Wali</th>
                <th className="py-3.5 px-6">WhatsApp</th>
                <th className="py-3.5 px-6 text-right">Aksi & Kartu QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada data siswa yang cocok.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {s.photoUrl ? (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-400 shrink-0 shadow-xs">
                            <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" title="Wajah Terdaftar" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div>{s.name}</div>
                          {s.photoUrl && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                              <ShieldCheck className="w-3 h-3" /> Wajah Terdaftar
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-600">{s.nisn}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-700">{s.className}</td>
                    <td className="py-3.5 px-6 text-slate-600">{s.parentName || '-'}</td>
                    <td className="py-3.5 px-6 font-mono text-slate-600">{s.parentPhone || '-'}</td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenQrCard(s)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Buka Kartu QR"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Kartu QR
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          title="Edit / Rename Siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(s)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus Siswa"
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

      {/* QR Card Modal with Anti-Google Lens encrypted badge */}
      {qrModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Kartu QR Anti-Google Lens
              </span>
              <button onClick={() => setQrModalStudent(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl shadow-xs" />}
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900">{qrModalStudent.name}</h4>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {qrModalStudent.className} • NISN: {qrModalStudent.nisn}
              </p>
              <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-left">
                <strong>Enkripsi Proprietary Aktif:</strong> Google Lens atau scanner lain hanya akan melihat token acak internal dan tidak bisa membacanya. Hanya web ini yang bisa memindai!
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Kartu Pelajar
            </button>
          </div>
        </div>
      )}

      {/* EDIT / RENAME STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              Edit / Rename Data Siswa
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Siswa</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  required
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                <select
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Orang Tua</label>
                <input
                  type="text"
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  value={editParentPhone}
                  onChange={(e) => setEditParentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Foto Wajah Biometrik Siswa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Foto Wajah Biometrik Siswa (Untuk Pengenalan Presisi)
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {editPhotoUrl ? (
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
                    <img src={editPhotoUrl} alt="Wajah Siswa" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-bold text-center py-0.5">
                      TERDAFTAR
                    </span>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400 shrink-0">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Belum Ada</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    {editPhotoUrl ? 'Foto Biometrik Tersimpan' : 'Perekaman Wajah Presisi'}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {editPhotoUrl
                      ? 'Profil biometrik aktif digunakan untuk verifikasi scan wajah presisi.'
                      : 'Ambil foto wajah dengan panduan oval agar siswa tidak bisa diabsenkan oleh orang lain.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFaceCameraTarget('edit');
                      setShowFaceCameraModal(true);
                    }}
                    className="mt-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {editPhotoUrl ? 'Ulangi Jepret Wajah' : 'Ambil Foto Wajah via Kamera'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddStudent}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-slate-900">Tambah Data Siswa Baru</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Siswa</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Muhammad Rizky"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  required
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="007123..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Orang Tua</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Bapak / Ibu..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Foto Wajah Biometrik Siswa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Foto Wajah Biometrik Siswa (Untuk Presensi Presisi)
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {photoUrl ? (
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
                    <img src={photoUrl} alt="Wajah Siswa" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-bold text-center py-0.5">
                      PRESISI
                    </span>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400 shrink-0">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Belum Ada</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    {photoUrl ? 'Foto Wajah Siap Digunakan' : 'Rekam Wajah Siswa'}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {photoUrl
                      ? 'Profil biometrik wajah telah tersimpan.'
                      : 'Wajah harus di posisi oval pas agar sistem mengenali secara presisi.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFaceCameraTarget('add');
                      setShowFaceCameraModal(true);
                    }}
                    className="mt-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {photoUrl ? 'Ulangi Ambil Foto Wajah' : 'Ambil Foto Wajah via Kamera'}
                  </button>
                </div>
              </div>
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
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRECISION FACE CAPTURE MODAL */}
      <PrecisionFaceCaptureModal
        isOpen={showFaceCameraModal}
        studentName={faceCameraTarget === 'add' ? name : editName}
        onCapture={(capturedUrl, descriptor) => {
          if (faceCameraTarget === 'add') {
            setPhotoUrl(capturedUrl);
            setFaceDescriptor(descriptor);
          } else {
            setEditPhotoUrl(capturedUrl);
            setEditFaceDescriptor(descriptor);
          }
        }}
        onClose={() => setShowFaceCameraModal(false)}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingStudent}
        title="Hapus Data Siswa"
        message="Apakah Anda yakin ingin menghapus data siswa ini secara permanen dari sistem?"
        itemName={deletingStudent ? `${deletingStudent.name} (${deletingStudent.className}) - NISN: ${deletingStudent.nisn}` : undefined}
        onCancel={() => setDeletingStudent(null)}
        onConfirm={async () => {
          if (deletingStudent) {
            await onDeleteStudent(deletingStudent.id);
            soundFx.playSuccess();
            setDeletingStudent(null);
          }
        }}
      />
    </div>
  );
};
