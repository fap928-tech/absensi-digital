import React, { useState, useEffect } from 'react';
import {
  School,
  Clock,
  Shield,
  LogOut,
  CloudCheck,
  User,
  Volume2,
  Calendar
} from 'lucide-react';
import { UserProfile, SchoolConfig } from '../types';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  currentUser: UserProfile | null;
  config: SchoolConfig;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  config,
  onLogout,
  activeTab,
  setActiveTab
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3" /> Administrator
          </span>
        );
      case 'guru':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <School className="w-3 h-3" /> Guru / Wali Kelas
          </span>
        );
      case 'murid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <User className="w-3 h-3" /> Siswa
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-md overflow-hidden p-1 border border-indigo-200">
              {config.schoolLogo ? (
                <img
                  src={config.schoolLogo}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80';
                  }}
                />
              ) : (
                <School className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                {config.schoolName || 'EduPresensi Pro'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CloudCheck className="w-3.5 h-3.5" /> Cloud Sync Aktif
                </span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline truncate">{config.schoolAddress || 'Sistem Absensi Terpadu'}</span>
              </div>
            </div>
          </div>

          {/* Clock & Live Status */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
            <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-900 font-mono tracking-wider">
                {currentTime} WIB
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {currentDate}
              </div>
            </div>
          </div>

          {/* Current User & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio chime tester button */}
            <button
              onClick={() => soundFx.playSuccess()}
              title="Tes Suara Audio Notifikasi"
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {currentUser && (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {currentUser.name.charAt(0)}
                  </div>
                )}

                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    {currentUser.name}
                  </div>
                  <div>{getRoleBadge(currentUser.role)}</div>
                </div>

                <button
                  onClick={onLogout}
                  title="Keluar dari Sistem"
                  className="ml-1 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        {currentUser && (
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 border-t border-slate-100 scrollbar-none">
            {currentUser.role === 'murid' && (
              <>
                <TabButton
                  active={activeTab === 'presensi'}
                  onClick={() => setActiveTab('presensi')}
                  label="Presensi Masuk & Pulang"
                />
                <TabButton
                  active={activeTab === 'setoran'}
                  onClick={() => setActiveTab('setoran')}
                  label="Setoran Harian Saya"
                />
                <TabButton
                  active={activeTab === 'jadwal'}
                  onClick={() => setActiveTab('jadwal')}
                  label="Jadwal & Pengingat"
                />
                <TabButton
                  active={activeTab === 'riwayat'}
                  onClick={() => setActiveTab('riwayat')}
                  label="Riwayat Kehadiran"
                />
              </>
            )}

            {currentUser.role === 'guru' && (
              <>
                <TabButton
                  active={activeTab === 'guru_monitor'}
                  onClick={() => setActiveTab('guru_monitor')}
                  label="Monitor Presensi Real-Time"
                />
                <TabButton
                  active={activeTab === 'guru_rekap'}
                  onClick={() => setActiveTab('guru_rekap')}
                  label="Rekap Harian & Bulanan"
                />
                <TabButton
                  active={activeTab === 'guru_setoran'}
                  onClick={() => setActiveTab('guru_setoran')}
                  label="Verifikasi Setoran Murid"
                />
                <TabButton
                  active={activeTab === 'guru_analitik'}
                  onClick={() => setActiveTab('guru_analitik')}
                  label="Analitik Performa Siswa"
                />
              </>
            )}

            {currentUser.role === 'admin' && (
              <>
                <TabButton
                  active={activeTab === 'admin_rekap'}
                  onClick={() => setActiveTab('admin_rekap')}
                  label="Master Rekap & Audit Data"
                />
                <TabButton
                  active={activeTab === 'admin_analitik'}
                  onClick={() => setActiveTab('admin_analitik')}
                  label="Statistik & Analitik"
                />
                <TabButton
                  active={activeTab === 'admin_pengaturan'}
                  onClick={() => setActiveTab('admin_pengaturan')}
                  label="Pengaturan Sekolah & Akun"
                />
                <TabButton
                  active={activeTab === 'admin_users'}
                  onClick={() => setActiveTab('admin_users')}
                  label="Manajemen Guru & Siswa"
                />
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label
}) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`}
  >
    {label}
  </button>
);
