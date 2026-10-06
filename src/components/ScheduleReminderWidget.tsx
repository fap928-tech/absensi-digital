import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  Volume2
} from 'lucide-react';
import { DailyScheduleItem } from '../types';
import { soundFx } from '../utils/audio';

export const ScheduleReminderWidget: React.FC = () => {
  const [activeDay, setActiveDay] = useState<string>('Senin');
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  useEffect(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = days[new Date().getDay()];
    if (['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].includes(today)) {
      setActiveDay(today);
    } else {
      setActiveDay('Senin');
    }
  }, []);

  const sampleSchedules: Record<string, DailyScheduleItem[]> = {
    Senin: [
      { day: 'Senin', subject: 'Upacara Bendera', time: '07:00 - 07:45', teacher: 'Pembina Upacara', room: 'Lapangan Utama' },
      { day: 'Senin', subject: 'Matematika Peminatan', time: '08:00 - 09:30', teacher: 'Dra. Sri Wahyuni', room: 'Ruang 10' },
      { day: 'Senin', subject: 'Fisika Kuantum', time: '09:45 - 11:15', teacher: 'Budi Santoso, S.Pd.', room: 'Lab Fisika' },
      { day: 'Senin', subject: 'Bahasa Indonesia', time: '11:15 - 12:45', teacher: 'Nur Hidayah, M.Pd.', room: 'Ruang 10' }
    ],
    Selasa: [
      { day: 'Selasa', subject: 'Biologi Genetika', time: '07:30 - 09:00', teacher: 'Dr. Hendra Wijaya', room: 'Lab Biologi' },
      { day: 'Selasa', subject: 'Kimia Larutan', time: '09:15 - 10:45', teacher: 'Siti Rahmawati, M.Pd.', room: 'Lab Kimia' },
      { day: 'Selasa', subject: 'Bahasa Inggris', time: '11:00 - 12:30', teacher: 'James Anderson, B.Ed.', room: 'Ruang Bahasa' }
    ],
    Rabu: [
      { day: 'Rabu', subject: 'Pendidikan Agama & Budi Pekerti', time: '07:30 - 09:00', teacher: 'Ust. Ahmad Fauzi, S.Pd.I', room: 'Masjid Sekolah' },
      { day: 'Rabu', subject: 'Sejarah Indonesia', time: '09:15 - 10:45', teacher: 'Drs. Supriyanto', room: 'Ruang 10' },
      { day: 'Rabu', subject: 'Informatika & Koding', time: '11:00 - 12:30', teacher: 'Ahmad Fauzi, S.Kom.', room: 'Lab Komputer' }
    ],
    Kamis: [
      { day: 'Kamis', subject: 'Sosiologi & Karakter', time: '07:30 - 09:00', teacher: 'Dra. Endang S.', room: 'Ruang 10' },
      { day: 'Kamis', subject: 'Pendidikan Jasmani (Olahraga)', time: '09:15 - 10:45', teacher: 'Bambang Tri, S.Pd.', room: 'GOR Olahraga' },
      { day: 'Kamis', subject: 'Seni Budaya & Keterampilan', time: '11:00 - 12:30', teacher: 'Dewi Lestari, S.Sn.', room: 'Studio Seni' }
    ],
    Jumat: [
      { day: 'Jumat', subject: 'Senam Pagi & Literasi Karakter', time: '07:00 - 08:00', teacher: 'Tim Kesiswaan', room: 'Halaman Sekolah' },
      { day: 'Jumat', subject: 'Kewarganegaraan (PPKn)', time: '08:15 - 09:45', teacher: 'H. Sudirman, M.Pd.', room: 'Ruang 10' },
      { day: 'Jumat', subject: 'Kajian Ibadah & Shalat Jumat', time: '10:00 - 12:30', teacher: 'Pembina Rohis', room: 'Masjid Sekolah' }
    ]
  };

  const handleToggleNotification = async () => {
    if (!('Notification' in window)) {
      soundFx.playAlert();
      setReminderNotice('Browser ini tidak mendukung Web Push Notification.');
      return;
    }

    if (Notification.permission === 'granted') {
      soundFx.playSuccess();
      setNotificationEnabled(true);
      setReminderNotice('Notifikasi push pengingat jadwal belajar telah diaktifkan!');
      new Notification('EduPresensi Pro', {
        body: 'Pengingat aktif! Anda akan diingatkan 15 menit sebelum jam pelajaran dimulai.',
        icon: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80'
      });
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        soundFx.playSuccess();
        setNotificationEnabled(true);
        setReminderNotice('Izin notifikasi disetujui! Pengingat jadwal belajar aktif.');
      } else {
        soundFx.playAlert();
        setReminderNotice('Izin notifikasi ditolak oleh browser.');
      }
    }
  };

  const currentList = sampleSchedules[activeDay] || sampleSchedules['Senin'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Calendar className="w-4 h-4" />
            Agenda & Jadwal Kegiatan Belajar
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Jadwal Belajar Harian & Pengingat
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau mata pelajaran hari ini dan aktifkan notifikasi otomatis sebelum kelas dimulai.
          </p>
        </div>

        <button
          onClick={handleToggleNotification}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
            notificationEnabled
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          {notificationEnabled ? 'Pengingat Aktif ✓' : 'Aktifkan Notifikasi Pengingat'}
        </button>
      </div>

      {reminderNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{reminderNotice}</span>
          <button onClick={() => setReminderNotice(null)} className="font-bold underline">Tutup</button>
        </div>
      )}

      {/* Day Selector */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex gap-1.5 overflow-x-auto">
        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold transition-all ${
              activeDay === day
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule Items */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Mata Pelajaran Hari {activeDay}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentList.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {item.time} WIB
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-semibold">
                  {item.room}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{item.subject}</h4>
              <p className="text-xs text-slate-500">Guru Pengampu: {item.teacher}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
