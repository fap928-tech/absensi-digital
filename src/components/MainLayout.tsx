import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Monitor,
  Users,
  UserCheck,
  Camera,
  FileText,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { SchoolConfig, UserProfile } from '../types';

interface MainLayoutProps {
  currentUser: UserProfile;
  config: SchoolConfig;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentUser,
  config,
  onLogout,
  activeTab,
  setActiveTab,
  children
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now
          .toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
          .replace(/:/g, '.') + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kelas', label: 'Data Kelas', icon: Monitor },
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'manual', label: 'Absen Manual', icon: UserCheck },
    { id: 'scanner', label: 'Scan Barcode / Wajah', icon: Camera },
    { id: 'rekap', label: 'Rekap Absensi', icon: FileText },
    { id: 'setoran', label: 'Rekap Setoran', icon: FileText },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings }
  ];

  const menuItems =
    currentUser.role === 'guru'
      ? [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'manual', label: 'Absen Manual', icon: UserCheck },
          { id: 'scanner', label: 'Scan Barcode / Wajah', icon: Camera }
        ]
      : allMenuItems;

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-900 flex flex-col font-sans">
      {/* Top Navbar matching screenshot exactly */}
      <header className="bg-gradient-to-r from-[#4035a5] via-[#4338ca] to-[#483aa8] text-white shadow-md z-30 px-4 sm:px-8 py-3.5 no-print">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Graduation Cap + School Name & Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-white truncate">
                {config.schoolName || 'SMA SAINS TAHFIDZ ISLAMIC CENTER'}
              </h1>
              <p className="text-[11px] text-white/80 font-normal tracking-wide truncate">
                {config.schoolSubtitle || 'Sistem Presensi Wajah & QR Terpadu'}
              </p>
            </div>
          </div>

          {/* Right: Date, Live Clock, and Settings/Profile Icon */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-[11px] font-medium text-white/80 leading-tight">
                {currentDate || 'Selasa, 6 Oktober 2026'}
              </div>
              <div className="text-sm font-black font-mono tracking-wider text-white leading-tight mt-0.5">
                {currentTime || '18.57.10 WIB'}
              </div>
            </div>

            {/* Gear Button with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                title="Menu Pengguna & Pengaturan"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 text-slate-800 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold truncate text-slate-900">{currentUser.name}</div>
                    <div className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">
                      {currentUser.role === 'admin' ? 'Administrator' : 'Guru / Wali Kelas'}
                    </div>
                  </div>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('pengaturan');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      Pengaturan
                    </button>
                  )}

                  <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-bold border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Keluar (Logout)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar matching screenshot */}
        <aside className="w-full md:w-56 shrink-0 no-print">
          <div className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm space-y-1">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#edf0ff] text-[#4035a5] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <IconComp
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#4035a5]' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
