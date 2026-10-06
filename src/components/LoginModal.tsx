import React, { useState } from 'react';
import {
  Lock,
  User,
  Shield,
  School,
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { UserProfile, SchoolConfig } from '../types';
import { soundFx } from '../utils/audio';

interface LoginModalProps {
  config: SchoolConfig;
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  config,
  users,
  onLoginSuccess
}) => {
  // Only Guru & Admin (students cannot login as requested)
  const [role, setRole] = useState<'guru' | 'admin'>('guru');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('Silakan masukkan nama pengguna atau NIP.');
      soundFx.playAlert();
      setIsSubmitting(false);
      return;
    }

    // 1. Check Admin role
    if (role === 'admin') {
      const adminUsername = config.adminUsername?.toLowerCase() || 'admin';
      const adminPassword = config.adminPassword || 'admin123';

      if (cleanUsername === adminUsername && cleanPassword === adminPassword) {
        soundFx.playSuccess();
        setSuccessMsg('Login Administrator Berhasil! Membuka portal...');
        const adminUser: UserProfile = {
          id: 'u_admin',
          role: 'admin',
          name: 'Administrator Sekolah',
          username: config.adminUsername
        };
        setTimeout(() => {
          onLoginSuccess(adminUser);
        }, 500);
        return;
      }
    }

    // 2. Check Guru accounts
    if (role === 'guru') {
      const foundTeacher = users.find((u) => {
        if (u.role !== 'guru') return false;
        const matchUser =
          u.username?.toLowerCase() === cleanUsername ||
          u.nip?.toLowerCase() === cleanUsername;
        if (!matchUser) return false;
        return (u.password || '') === cleanPassword;
      });

      if (foundTeacher) {
        soundFx.playSuccess();
        setSuccessMsg(`Selamat datang, ${foundTeacher.name}! Login berhasil.`);
        setTimeout(() => {
          onLoginSuccess(foundTeacher);
        }, 500);
        return;
      }
    }

    // Failed
    soundFx.playAlert();
    setErrorMsg('Nama pengguna atau kata sandi tidak cocok. Silakan periksa kembali.');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner matching royal purple style */}
        <div className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 text-white text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-white/10 rounded-2xl p-2.5 backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center">
            {config.schoolLogo ? (
              <img
                src={config.schoolLogo}
                alt="Logo Sekolah"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <School className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-lg font-black tracking-tight leading-snug">
            {config.schoolName || 'SMA SAINS TAHFIDZ ISLAMIC CENTER'}
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1">
            {config.schoolSubtitle || 'Sistem Presensi Wajah & QR Terpadu'}
          </p>
          <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold tracking-wide">
            Portal Khusus Guru & Administrator
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Role Tabs: ONLY GURU & ADMIN */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setRole('guru');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                role === 'guru'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <School className="w-4 h-4" />
              Guru / Wali Kelas
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('admin');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                role === 'admin'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              Administrator
            </button>
          </div>

          {/* Alert feedback */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {role === 'guru' ? 'Nama Pengguna atau NIP Guru' : 'Nama Pengguna Admin'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'guru' ? 'Masukkan NIP atau username guru' : 'admin'}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? 'Memeriksa Kredensial...' : 'Masuk ke Portal'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Siswa tidak memiliki akses login langsung. Presensi siswa dilakukan oleh Guru / Petugas melalui pemindaian QR / Kamera wajah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
