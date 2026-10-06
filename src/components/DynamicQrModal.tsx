import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Clock,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { SchoolConfig } from '../types';
import { generateEncryptedQrPayload, generateQrDataUrl } from '../utils/cryptoQr';

interface DynamicQrModalProps {
  config: SchoolConfig;
  className: string;
  onClose: () => void;
}

export const DynamicQrModal: React.FC<DynamicQrModalProps> = ({
  config,
  className,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(45);
  const [rawEncryptedToken, setRawEncryptedToken] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const rotateQr = async () => {
    const payload = {
      schoolId: config.id,
      className: className || 'X MIPA 1',
      timestamp: Date.now(),
      sessionId: `SES_${Math.floor(Math.random() * 999999)}`,
      type: 'DYNAMIC_CLASS_ROOM' as const
    };

    const encryptedToken = generateEncryptedQrPayload(payload, config.qrSecuritySalt);
    setRawEncryptedToken(encryptedToken);

    try {
      const url = await generateQrDataUrl(encryptedToken, 420);
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR data URL:', err);
    }
    setCountdown(45);
  };

  useEffect(() => {
    rotateQr();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          rotateQr();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [className, config.id, config.qrSecuritySalt]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden text-center p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Teknologi QR Terenkripsi Anti-Google Lens
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Barcode Presensi Proyektor Kelas
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Siswa memindai menggunakan kamera di menu Siswa. QR ini otomatis diperbarui setiap 45 detik untuk mencegah kecurangan tangkapan layar.
          </p>
        </div>

        {/* QR Display Frame */}
        <div className="relative inline-block p-4 sm:p-6 bg-slate-50 rounded-3xl border-2 border-indigo-200 shadow-inner">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code Presensi"
              className="w-64 h-64 sm:w-80 sm:h-80 mx-auto rounded-2xl shadow-md border border-slate-200"
            />
          ) : (
            <div className="w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          )}

          {/* Countdown indicator */}
          <div className="mt-4 flex items-center justify-between text-xs font-mono font-bold text-slate-600 px-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Berganti dalam:
            </span>
            <span className="text-indigo-600 text-sm font-black">{countdown}s</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              style={{ width: `${(countdown / 45) * 100}%` }}
              className="bg-indigo-600 h-full transition-all duration-1000 rounded-full"
            />
          </div>
        </div>

        {/* Security Info & Refresh Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={rotateQr}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Segarkan Token Sekarang
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Maximize2 className="w-4 h-4" /> Mode Layar Penuh (Proyektor)
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-500 text-left">
          <strong className="block text-slate-700 font-bold mb-0.5">Uji Keamanan Google Lens:</strong>
          Jika dipindai dengan Google Lens atau kamera luar, akan muncul token terenkripsi:{' '}
          <code className="text-slate-800 font-mono text-[10px] break-all">
            {rawEncryptedToken.substring(0, 36)}...
          </code>{' '}
          (Tidak bisa dibaca oleh scanner pihak ketiga).
        </div>
      </div>
    </div>
  );
};
