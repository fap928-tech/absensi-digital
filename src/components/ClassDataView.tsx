import React, { useState } from 'react';
import { SchoolClass, UserProfile } from '../types';
import { Plus, Trash2, Edit3, Monitor, Users } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { soundFx } from '../utils/audio';

interface ClassDataViewProps {
  classes: SchoolClass[];
  teachers: UserProfile[];
  students: UserProfile[];
  onSaveClasses: (classes: SchoolClass[]) => void;
  onUpdateClass?: (id: string, updates: Partial<SchoolClass>) => Promise<void>;
}

export const ClassDataView: React.FC<ClassDataViewProps> = ({
  classes,
  teachers,
  students,
  onSaveClasses,
  onUpdateClass
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [className, setClassName] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(
    teachers[0]?.name || 'Ustadz Budi Santoso, S.Pd.'
  );

  // Edit / Rename class modal
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editTeacher, setEditTeacher] = useState('');

  // Delete modal state
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    const newClass: SchoolClass = {
      id: `c_${Date.now()}`,
      name: className.trim(),
      homeroomTeacher: selectedTeacher
    };

    const updated = [...classes, newClass];
    onSaveClasses(updated);
    soundFx.playSuccess();
    setClassName('');
    setShowAddModal(false);
  };

  const handleOpenEdit = (c: SchoolClass) => {
    setEditingClass(c);
    setEditClassName(c.name);
    setEditTeacher(c.homeroomTeacher);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClassName.trim()) return;

    if (onUpdateClass) {
      await onUpdateClass(editingClass.id, {
        name: editClassName.trim(),
        homeroomTeacher: editTeacher
      });
    } else {
      const updated = classes.map((c) =>
        c.id === editingClass.id
          ? { ...c, name: editClassName.trim(), homeroomTeacher: editTeacher }
          : c
      );
      onSaveClasses(updated);
    }

    soundFx.playSuccess();
    setEditingClass(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingClass) return;
    const updated = classes.filter((c) => c.id !== deletingClass.id);
    onSaveClasses(updated);
    soundFx.playSuccess();
    setDeletingClass(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-600" />
            Manajemen & Rename Data Kelas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar rombongan belajar, ubah nama kelas, dan tentukan wali kelas pembimbing.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Kelas
        </button>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classes.map((c) => {
          const studentCount = students.filter((s) => s.className === c.name).length;
          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900">{c.name}</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {studentCount} Siswa
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                    Wali Kelas:
                  </span>
                  <span className="font-bold text-slate-800">{c.homeroomTeacher}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="Rename Kelas & Ganti Wali"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingClass(c)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Kelas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT / RENAME CLASS MODAL */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              Edit / Rename Data Kelas
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas</label>
              <input
                type="text"
                required
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Wali Kelas</label>
              <select
                value={editTeacher}
                onChange={(e) => setEditTeacher(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddClass}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-slate-900">Tambah Kelas Baru</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas</label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="contoh: X IPA 2"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Wali Kelas</label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
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

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingClass}
        title="Hapus Data Kelas"
        message="Apakah Anda yakin ingin menghapus kelas ini dari sistem?"
        itemName={deletingClass ? `Kelas ${deletingClass.name} (Wali: ${deletingClass.homeroomTeacher})` : undefined}
        onCancel={() => setDeletingClass(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
