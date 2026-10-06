import React, { useState } from 'react';
import {
  Settings,
  School,
  MapPin,
  Clock,
  Key,
  Users,
  Database,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  SchoolConfig,
  UserProfile,
  SchoolClass
} from '../types';
import { getCurrentGeoPosition } from '../utils/geo';
import { soundFx } from '../utils/audio';

interface AdminSettingsViewProps {
  config: SchoolConfig;
  users: UserProfile[];
  classes: SchoolClass[];
  onUpdateConfig: (newConfig: Partial<SchoolConfig>) => Promise<SchoolConfig>;
  onSaveUser: (user: UserProfile) => Promise<UserProfile>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSaveClasses: (classes: SchoolClass[]) => void;
  onExportBackup: () => string;
  onImportBackup: (jsonStr: string) => Promise<boolean>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  config,
  users,
  classes,
  onUpdateConfig,
  onSaveUser,
  onDeleteUser,
  onExportBackup,
  onImportBackup
}) => {
  const [activeTab, setActiveTab] = useState<'sekolah' | 'jadwal' | 'guru' | 'admin_auth' | 'backup'>('sekolah');
  const [formConfig, setFormConfig] = useState<SchoolConfig>({ ...config });
  const [gpsDetecting, setGpsDetecting] = useState<boolean>(false);
  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  // New Teacher Account State
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('guru123');
  const [teacherClass, setTeacherClass] = useState(classes[0]?.name || 'X IPA 1');
  const [deletingTeacher, setDeletingTeacher] = useState<UserProfile | null>(null);

  const teachers = users.filter((u) => u.role === 'guru');

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateConfig(formConfig);
      soundFx.playSuccess();
      setSavingNotice('Pengaturan sekolah & jadwal presensi berhasil disimpan!');
      setTimeout(() => setSavingNotice(null), 3000);
    } catch {
      soundFx.playAlert();
      setSavingNotice('Gagal menyimpan konfigurasi.');
    }
  };

  const handleAutoDetectGPS = async () => {
    setGpsDetecting(true);
    try {
      const pos = await getCurrentGeoPosition();
      setFormConfig((prev) => ({
        ...prev,
        latitude: Number(pos.latitude.toFixed(6)),
        longitude: Number(pos.longitude.toFixed(6))
      }));
      soundFx.playSuccess();
      setSavingNotice(`GPS Sekolah sinkron: Lat ${pos.latitude}, Lng ${pos.longitude}`);
      setTimeout(() => setSavingNotice(null), 4000);
    } catch (err) {
      soundFx.playAlert();
      setSavingNotice('Gagal membaca GPS: ' + (err instanceof Error ? err.message : 'Izin ditolak'));
      setTimeout(() => setSavingNotice(null), 4000);
    } finally {
      setGpsDetecting(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherUsername.trim()) return;

    const newTeacher: UserProfile = {
      id: `u_guru_${Date.now()}`,
      role: 'guru',
      name: teacherName.trim(),
      nip: teacherNip.trim() || undefined,
      username: teacherUsername.trim(),
      password: teacherPassword.trim() || 'guru123',
      className: teacherClass
    };

    await onSaveUser(newTeacher);
    soundFx.playSuccess();
    setTeacherName('');
    setTeacherNip('');
    setTeacherUsername('');
    setTeacherPassword('guru123');
    setShowAddTeacherModal(false);
    setSavingNotice(`Akun guru "${newTeacher.name}" berhasil dibuat! Guru dapat langsung login.`);
    setTimeout(() => setSavingNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Pengaturan Sistem & Administrasi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola identitas sekolah, jadwal custom clock in/out, akun guru, dan sandi admin.
          </p>
        </div>
      </div>

      {savingNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savingNotice}</span>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('sekolah')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'sekolah'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <School className="w-3.5 h-3.5" /> Identitas Sekolah
        </button>
        <button
          onClick={() => setActiveTab('jadwal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'jadwal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Jadwal Clock In & Out
        </button>
        <button
          onClick={() => setActiveTab('guru')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'guru'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Akun Login Guru
        </button>
        <button
          onClick={() => setActiveTab('admin_auth')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'admin_auth'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Key className="w-3.5 h-3.5" /> Akun & Sandi Admin
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Backup Data
        </button>
      </div>

      {/* TAB 1: IDENTITAS SEKOLAH & LOGO */}
      {activeTab === 'sekolah' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Profil & Logo Sekolah</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah</label>
              <input
                type="text"
                required
                value={formConfig.schoolName}
                onChange={(e) => setFormConfig({ ...formConfig, schoolName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subjudul Aplikasi</label>
              <input
                type="text"
                value={formConfig.schoolSubtitle}
                onChange={(e) => setFormConfig({ ...formConfig, schoolSubtitle: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Sekolah</label>
              <input
                type="text"
                value={formConfig.schoolAddress}
                onChange={(e) => setFormConfig({ ...formConfig, schoolAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={formConfig.phone}
                onChange={(e) => setFormConfig({ ...formConfig, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">URL Logo Sekolah</label>
            <input
              type="text"
              value={formConfig.schoolLogo}
              onChange={(e) => setFormConfig({ ...formConfig, schoolLogo: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" /> Simpan Identitas
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: CUSTOM JADWAL CLOCK IN & OUT */}
      {activeTab === 'jadwal' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Custom Jadwal Clock In & Clock Out</h3>
            <p className="text-xs text-slate-500">
              Atur batas awal, batas toleransi tepat waktu, dan batas akhir absensi siswa.
            </p>
          </div>

          {/* Clock In Settings */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Pengaturan Jadwal Clock In (Masuk)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Batas Absen Awal Clock In
                </label>
                <input
                  type="time"
                  required
                  value={formConfig.clockInStart}
                  onChange={(e) => setFormConfig({ ...formConfig, clockInStart: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Mulai dibuka (e.g. 06:00)</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Batas Tepat Waktu (Lewat = Terlambat)
                </label>
                <input
                  type="time"
                  required
                  value={formConfig.clockInLate}
                  onChange={(e) => setFormConfig({ ...formConfig, clockInLate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold text-amber-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Batas masuk (e.g. 07:15)</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Batas Absen Akhir Clock In
                </label>
                <input
                  type="time"
                  required
                  value={formConfig.clockInEnd}
                  onChange={(e) => setFormConfig({ ...formConfig, clockInEnd: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Ditutup (e.g. 08:30)</span>
              </div>
            </div>
          </div>

          {/* Clock Out Settings */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Pengaturan Jadwal Clock Out (Pulang)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Batas Absen Awal Clock Out
                </label>
                <input
                  type="time"
                  required
                  value={formConfig.clockOutStart}
                  onChange={(e) => setFormConfig({ ...formConfig, clockOutStart: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Mulai jam pulang (e.g. 14:00)</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Batas Absen Akhir Clock Out
                </label>
                <input
                  type="time"
                  required
                  value={formConfig.clockOutEnd}
                  onChange={(e) => setFormConfig({ ...formConfig, clockOutEnd: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Batas akhir pulang (e.g. 17:00)</span>
              </div>
            </div>
          </div>

          {/* GPS Coordinates & Radius */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Geofencing Titik Koordinat & Radius GPS Sekolah
              </h4>
              <button
                type="button"
                onClick={handleAutoDetectGPS}
                disabled={gpsDetecting}
                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gpsDetecting ? 'animate-spin' : ''}`} />
                Gunakan GPS Saya Saat Ini
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formConfig.latitude}
                  onChange={(e) => setFormConfig({ ...formConfig, latitude: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formConfig.longitude}
                  onChange={(e) => setFormConfig({ ...formConfig, longitude: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Radius Toleransi (Meter)</label>
                <input
                  type="number"
                  value={formConfig.radiusMeters}
                  onChange={(e) => setFormConfig({ ...formConfig, radiusMeters: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" /> Simpan Jadwal & Lokasi
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MANAJEMEN AKUN GURU (Admin bisa buat akun guru untuk login absen) */}
      {activeTab === 'guru' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manajemen Akun Login Guru</h3>
              <p className="text-xs text-slate-500">
                Administrator dapat membuatkan akun login bagi para guru untuk mengabsen anak murid.
              </p>
            </div>
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Buat Akun Guru Baru
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Guru</th>
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4">Username Login</th>
                  <th className="py-3 px-4">Wali Kelas</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{t.nip || '-'}</td>
                    <td className="py-3 px-4 font-mono text-indigo-700 font-semibold">{t.username}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{t.className || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeletingTeacher(t)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Hapus Akun Guru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AKUN & KATA SANDI ADMIN */}
      {activeTab === 'admin_auth' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 max-w-lg">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Perbarui Kredensial Administrator</h3>
            <p className="text-xs text-slate-500">
              Nama pengguna dan kata sandi admin dapat diperbarui kapan saja.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username Admin Baru</label>
            <input
              type="text"
              required
              value={formConfig.adminUsername}
              onChange={(e) => setFormConfig({ ...formConfig, adminUsername: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi (Password Admin Baru)</label>
            <input
              type="password"
              required
              value={formConfig.adminPassword}
              onChange={(e) => setFormConfig({ ...formConfig, adminPassword: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" /> Perbarui Akun Admin
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 max-w-lg">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cadangan & Pemulihan Data</h3>
            <p className="text-xs text-slate-500">
              Unduh atau pulihkan file backup data sekolah, guru, siswa, dan absensi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const str = onExportBackup();
                const blob = new Blob([str], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_absensi_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                soundFx.playSuccess();
              }}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Unduh Cadangan JSON
            </button>

            <label className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              <Upload className="w-4 h-4" /> Pulihkan JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const content = ev.target?.result as string;
                    const ok = await onImportBackup(content);
                    if (ok) {
                      soundFx.playSuccess();
                      setSavingNotice('Data cadangan berhasil dipulihkan!');
                      setTimeout(() => window.location.reload(), 1200);
                    } else {
                      soundFx.playAlert();
                      setSavingNotice('Format file cadangan tidak valid.');
                      setTimeout(() => setSavingNotice(null), 4000);
                    }
                  };
                  reader.readAsText(f);
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Modal Add Teacher Account */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTeacher}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Buat Akun Login Guru Baru
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Guru</label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="contoh: Ustadzah Nurul Hidayah, S.Pd."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP (Opsional)</label>
                <input
                  type="text"
                  value={teacherNip}
                  onChange={(e) => setTeacherNip(e.target.value)}
                  placeholder="1985..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Wali Kelas</label>
                <select
                  value={teacherClass}
                  onChange={(e) => setTeacherClass(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username Login</label>
                <input
                  type="text"
                  required
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  placeholder="nurul123"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password Login</label>
                <input
                  type="text"
                  required
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="guru123"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTeacherModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Buat Akun
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE TEACHER MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingTeacher}
        title="Hapus Akun Guru"
        message="Apakah Anda yakin ingin menghapus akun login guru ini?"
        itemName={deletingTeacher ? `${deletingTeacher.name} (NIP: ${deletingTeacher.nip || '-'}) - Username: ${deletingTeacher.username}` : undefined}
        onCancel={() => setDeletingTeacher(null)}
        onConfirm={async () => {
          if (deletingTeacher) {
            await onDeleteUser(deletingTeacher.id);
            soundFx.playSuccess();
            setDeletingTeacher(null);
          }
        }}
      />
    </div>
  );
};
