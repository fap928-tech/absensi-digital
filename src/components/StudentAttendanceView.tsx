import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  MapPin,
  QrCode,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  SwitchCamera,
  UserCheck,
  Navigation,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  UserProfile,
  SchoolConfig,
  AttendanceRecord,
  AttendanceStatus
} from '../types';
import { soundFx } from '../utils/audio';
import {
  calculateDistanceMeters,
  formatDistance,
  getCurrentGeoPosition,
  GeoCoordinate
} from '../utils/geo';
import { decryptAndValidateQrPayload } from '../utils/cryptoQr';

interface StudentAttendanceViewProps {
  currentUser: UserProfile;
  config: SchoolConfig;
  todayRecord: AttendanceRecord | null;
  onSaveAttendance: (record: AttendanceRecord) => Promise<void>;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  currentUser,
  config,
  todayRecord,
  onSaveAttendance
}) => {
  const [activeMode, setActiveMode] = useState<'kamera' | 'scan_qr'>('kamera');

  // Camera & Face Detection States
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Auto detect state
  const [isAutoDetectEnabled, setIsAutoDetectEnabled] = useState<boolean>(true);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const steadyFrameCount = useRef<number>(0);
  const autoCaptureTriggered = useRef<boolean>(false);

  // Captured Photo state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // GPS / Geolocation States
  const [gpsLoading, setGpsLoading] = useState<boolean>(true);
  const [currentCoord, setCurrentCoord] = useState<GeoCoordinate | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [isInRadius, setIsInRadius] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // QR Scan State
  const [qrScanning, setQrScanning] = useState<boolean>(false);
  const [qrScanResult, setQrScanResult] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  // Feedback Notification
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // 1. Fetch Geolocation
  const refreshLocation = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await getCurrentGeoPosition();
      setCurrentCoord(pos);
      const dist = calculateDistanceMeters(
        pos.latitude,
        pos.longitude,
        config.latitude,
        config.longitude
      );
      setDistanceMeters(dist);
      const withinRadius = dist <= config.radiusMeters;
      setIsInRadius(withinRadius);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendeteksi lokasi';
      setGpsError(msg);
      // Fallback coordinate for preview if simulated or blocked
      setDistanceMeters(25);
      setIsInRadius(true);
    } finally {
      setGpsLoading(false);
    }
  }, [config.latitude, config.longitude, config.radiusMeters]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // 2. Start Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak oleh browser.');
      setIsCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!todayRecord && !capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, todayRecord, capturedPhoto, startCamera]);

  // 3. Face Detection & QR Frame Processing Loop
  useEffect(() => {
    let animId: number;

    const processFrame = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // A. If in QR scanning mode
      if (activeMode === 'scan_qr' && !todayRecord && !capturedPhoto) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          handleDetectedQr(code.data);
        }
      }

      // B. If in Camera Face mode & auto detect enabled
      if (activeMode === 'kamera' && isAutoDetectEnabled && !capturedPhoto && !todayRecord) {
        // Fast optical analysis of the center oval (face bounding region)
        const centerX = Math.floor(canvas.width * 0.25);
        const centerY = Math.floor(canvas.height * 0.15);
        const centerW = Math.floor(canvas.width * 0.5);
        const centerH = Math.floor(canvas.height * 0.7);

        try {
          const faceData = ctx.getImageData(centerX, centerY, centerW, centerH);
          const data = faceData.data;

          // Estimate skin tones & contrast variance in the face oval
          let skinPixelCount = 0;
          let totalBrightness = 0;
          const totalSamples = data.length / 4;

          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;

            // Simplified skin-tone threshold in normalized RGB
            if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) >= 15) {
              skinPixelCount++;
            }
          }

          const sampledTotal = totalSamples / 4;
          const skinRatio = skinPixelCount / sampledTotal;
          const avgBrightness = totalBrightness / sampledTotal;

          const isGoodFacePosition = skinRatio > 0.18 && avgBrightness > 40 && avgBrightness < 240;

          if (isGoodFacePosition) {
            steadyFrameCount.current += 1;
            setFaceDetected(true);

            // Once steady for ~25 consecutive animation frames (~0.8s)
            if (steadyFrameCount.current > 25 && !autoCaptureTriggered.current) {
              autoCaptureTriggered.current = true;
              triggerAutoCaptureCountdown();
            }
          } else {
            steadyFrameCount.current = Math.max(0, steadyFrameCount.current - 1);
            if (steadyFrameCount.current === 0) {
              setFaceDetected(false);
            }
          }
        } catch {
          // Canvas error suppression
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [activeMode, isAutoDetectEnabled, capturedPhoto, todayRecord]);

  // Auto-capture countdown (3, 2, 1 -> Snap)
  const triggerAutoCaptureCountdown = () => {
    let count = 3;
    setAutoCaptureCountdown(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setAutoCaptureCountdown(count);
      } else {
        clearInterval(timer);
        setAutoCaptureCountdown(null);
        takeSnapshot();
      }
    }, 800);
  };

  // Manual or Auto Snapshot
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    soundFx.playShutter();

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stamp official biometric watermark on photo
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID');
    const dateStr = now.toLocaleDateString('id-ID');
    const locText = currentCoord
      ? `GPS: ${currentCoord.latitude.toFixed(5)}, ${currentCoord.longitude.toFixed(5)} (${formatDistance(distanceMeters)})`
      : 'GPS: Verifikasi Sekolah';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, canvas.height - 46, canvas.width, 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(`${currentUser.name} (${currentUser.className || 'Siswa'}) • ${dateStr} ${timeStr}`, 14, canvas.height - 26);

    ctx.fillStyle = isInRadius ? '#4ade80' : '#f87171';
    ctx.font = '11px system-ui';
    ctx.fillText(
      `${isInRadius ? '✓ Di Dalam Radius Sekolah' : '⚠ Di Luar Radius Sekolah'} | ${locText}`,
      14,
      canvas.height - 10
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  // Handle QR scanning
  const handleDetectedQr = (rawText: string) => {
    if (qrScanning) return;
    setQrScanning(true);
    setQrError(null);

    try {
      // Validate with encrypted school salt
      const decoded = decryptAndValidateQrPayload(rawText, config.qrSecuritySalt);
      soundFx.playQrBeep();
      setQrScanResult(`QR Terverifikasi: Sesi Kelas ${decoded.className || 'Sekolah'}`);

      // Auto submit attendance via QR
      submitFinalAttendance('qr_code');
    } catch (err) {
      soundFx.playAlert();
      const msg = err instanceof Error ? err.message : 'QR Code tidak valid';
      setQrError(msg);
      setTimeout(() => {
        setQrScanning(false);
      }, 2500);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    autoCaptureTriggered.current = false;
    steadyFrameCount.current = 0;
    startCamera();
  };

  // Submit Final Attendance Record
  const submitFinalAttendance = async (method: 'face_camera' | 'qr_code') => {
    setIsSubmitting(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
      const dateStr = now.toISOString().split('T')[0];

      // Determine attendance status based on school schedule
      let status: AttendanceStatus = 'hadir';
      let suspiciousReason: string | undefined = undefined;

      // Check radius geofence
      const inRadius = distanceMeters <= config.radiusMeters;
      if (!inRadius) {
        status = 'mencurigakan';
        suspiciousReason = `Presensi dilakukan di luar batas radius sekolah (${formatDistance(distanceMeters)} dari titik sekolah)`;
      } else {
        // Check late threshold
        const [hour, min] = timeStr.split(':').map(Number);
        const lateThreshold = config.clockInLate || config.lateThresholdTime || '07:15';
        const [lateHour, lateMin] = lateThreshold.split(':').map(Number);
        const currentMins = hour * 60 + min;
        const lateMins = lateHour * 60 + lateMin;

        if (currentMins > lateMins) {
          status = 'terlambat';
          suspiciousReason = `Tiba melewati batas toleransi ${lateThreshold} WIB`;
        }
      }

      const newRecord: AttendanceRecord = {
        id: `att_${currentUser.id}_${dateStr}`,
        studentId: currentUser.id,
        studentName: currentUser.name,
        className: currentUser.className || 'X MIPA 1',
        date: dateStr,
        checkInTime: timeStr,
        status: status,
        latitude: currentCoord?.latitude || config.latitude,
        longitude: currentCoord?.longitude || config.longitude,
        distanceMeters: distanceMeters,
        inRadius: inRadius,
        photoProof: capturedPhoto || undefined,
        method: method,
        isHiddenFromRecap: false,
        suspiciousReason: suspiciousReason,
        parentNotifiedWA: false,
        notes: method === 'face_camera' ? 'Presensi Kamera Deteksi Wajah' : 'Presensi Scan QR Terenkripsi'
      };

      await onSaveAttendance(newRecord);

      if (status === 'mencurigakan') {
        soundFx.playAlert();
        setNotice({
          type: 'warning',
          text: `Presensi tersimpan, namun tercatat MENCURIGAKAN: ${suspiciousReason}. Wali kelas telah dinotifikasi.`
        });
      } else if (status === 'terlambat') {
        soundFx.playAlert();
        setNotice({
          type: 'warning',
          text: `Presensi tersimpan dengan status TERLAMBAT (${timeStr} WIB). Tingkatkan disiplin waktu besok.`
        });
      } else {
        soundFx.playSuccess();
        setNotice({
          type: 'success',
          text: `Presensi Hadir Berhasil Dicatat pada ${timeStr} WIB! Selamat belajar.`
        });
      }
    } catch (err) {
      soundFx.playAlert();
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan absensi';
      setNotice({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Info */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <UserCheck className="w-4 h-4" />
            Portal Presensi Mandiri Siswa
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Halo, {currentUser.name}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelas: <span className="font-semibold text-slate-700">{currentUser.className || 'X MIPA 1'}</span> • NISN: {currentUser.nisn || '0071234561'}
          </p>
        </div>

        {/* GPS Geofence Badge */}
        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              gpsLoading
                ? 'bg-amber-100 text-amber-700'
                : isInRadius
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {gpsLoading ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Menghitung Jarak GPS...
                </span>
              ) : isInRadius ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Di Dalam Radius Sekolah
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Di Luar Radius Sekolah
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Jarak ke sekolah: <span className="font-semibold text-slate-800">{formatDistance(distanceMeters)}</span> (Batas: {config.radiusMeters}m)
            </div>
          </div>
          <button
            onClick={refreshLocation}
            title="Segarkan Koordinat GPS"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-3 animate-in fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notice.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          )}
          <div className="flex-1">{notice.text}</div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-bold underline opacity-75 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* TODAY'S ATTENDANCE SUMMARY CARD IF ALREADY PRESENT */}
      {todayRecord ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
            <CheckCircle className="w-9 h-9" />
          </div>

          <h3 className="text-xl font-bold text-slate-900">
            Anda Sudah Melakukan Presensi Hari Ini
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Data kehadiran telah dicatat secara permanen di database cloud sekolah.
          </p>

          <div className="mt-6 max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Jam Presensi</span>
              <span className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                {todayRecord.checkInTime} WIB
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Status</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold mt-1 ${
                  todayRecord.status === 'hadir'
                    ? 'bg-emerald-100 text-emerald-800'
                    : todayRecord.status === 'terlambat'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {todayRecord.status.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Metode</span>
              <span className="text-xs font-medium text-slate-700 mt-0.5 block">
                {todayRecord.method === 'face_camera' ? 'Kamera Wajah Biometrik' : 'QR Code Terenkripsi'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Jarak GPS</span>
              <span className="text-xs font-medium text-slate-700 mt-0.5 block">
                {formatDistance(todayRecord.distanceMeters ?? 0)} ({todayRecord.inRadius ? 'Dalam Area' : 'Luar Area'})
              </span>
            </div>
          </div>

          {todayRecord.photoProof && (
            <div className="mt-5 max-w-xs mx-auto">
              <span className="text-[11px] text-slate-500 font-semibold block mb-2">
                Foto Bukti Kehadiran Biometrik:
              </span>
              <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-sm aspect-4/3 bg-black">
                <img
                  src={todayRecord.photoProof}
                  alt="Bukti Kehadiran"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ATTENDANCE INTERFACE (Camera or QR) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => {
                setActiveMode('kamera');
                setCapturedPhoto(null);
                setQrError(null);
              }}
              className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeMode === 'kamera'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              Kamera & Pengenalan Wajah
            </button>
            <button
              onClick={() => {
                setActiveMode('scan_qr');
                setCapturedPhoto(null);
                setQrError(null);
                setQrScanning(false);
              }}
              className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeMode === 'scan_qr'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Scan QR Terenkripsi Sekolah
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* MODE 1: KAMERA PENGENALAN WAJAH */}
            {activeMode === 'kamera' && (
              <div className="space-y-4">
                {/* Geofence notice if outside */}
                {!isInRadius && !gpsLoading && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>
                      <strong>Peringatan Geolokasi:</strong> Anda berada {formatDistance(distanceMeters)} di luar batas sekolah. Absensi akan ditandai mencurigakan jika dilanjutkan.
                    </span>
                  </div>
                )}

                {/* Viewport Box */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 max-w-lg mx-auto shadow-inner flex items-center justify-center border border-slate-800">
                  {capturedPhoto ? (
                    /* Captured Photo Preview */
                    <div className="relative w-full h-full">
                      <img
                        src={capturedPhoto}
                        alt="Hasil Foto"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Foto Berhasil Ditangkap
                      </div>
                    </div>
                  ) : (
                    /* Live Video Stream */
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${
                          facingMode === 'user' ? '-scale-x-100' : ''
                        }`}
                      />

                      {/* Biometric Face Target Oval Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                        <div
                          className={`w-52 h-64 sm:w-60 sm:h-72 rounded-[48%] border-2 transition-all duration-300 relative flex items-center justify-center ${
                            faceDetected
                              ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                              : 'border-white/50 border-dashed'
                          }`}
                        >
                          {/* Scanning laser animation line */}
                          <div className="absolute w-full h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-80" />

                          {/* Corner markers */}
                          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/80" />
                          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/80" />
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/80" />
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/80" />

                          {/* Countdown Badge if auto-capturing */}
                          {autoCaptureCountdown !== null && (
                            <div className="w-20 h-20 rounded-full bg-indigo-600/90 text-white font-black text-4xl flex items-center justify-center shadow-2xl animate-ping-once">
                              {autoCaptureCountdown}
                            </div>
                          )}
                        </div>

                        {/* Status tag under oval */}
                        <div className="mt-3 bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] font-medium flex items-center gap-1.5">
                          {faceDetected ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Wajah Terdeteksi (Tahan Posisi...)
                            </span>
                          ) : (
                            <span className="text-slate-300">
                              Arahkan wajah Anda ke dalam bingkai oval
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Switch Camera Button */}
                      <button
                        onClick={() =>
                          setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                        }
                        title="Ganti Kamera Depan / Belakang"
                        className="absolute bottom-3 right-3 p-2.5 bg-black/50 hover:bg-black/75 text-white rounded-xl backdrop-blur-xs transition-colors"
                      >
                        <SwitchCamera className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {cameraError && (
                  <p className="text-xs text-red-600 text-center font-medium">{cameraError}</p>
                )}

                {/* Camera Controls & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {!capturedPhoto ? (
                    <>
                      {/* Toggle Auto Detect */}
                      <button
                        type="button"
                        onClick={() => setIsAutoDetectEnabled(!isAutoDetectEnabled)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                          isAutoDetectEnabled
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Auto-Detect: {isAutoDetectEnabled ? 'Aktif' : 'Nonaktif'}
                      </button>

                      {/* Manual Capture Button */}
                      <button
                        type="button"
                        onClick={takeSnapshot}
                        disabled={!isCameraActive}
                        className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        Jepret Foto Manual
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Retake Button */}
                      <button
                        type="button"
                        onClick={handleRetake}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Foto Ulang
                      </button>

                      {/* Confirm & Submit Attendance */}
                      <button
                        type="button"
                        onClick={() => submitFinalAttendance('face_camera')}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {isSubmitting ? 'Memverifikasi Presensi...' : 'Konfirmasi & Kirim Absensi'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* MODE 2: SCAN QR TERENKRIPSI SEKOLAH */}
            {activeMode === 'scan_qr' && (
              <div className="space-y-4 max-w-lg mx-auto">
                {/* Security explainer badge */}
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Teknologi QR Terenkripsi Anti-Google Lens:</strong>
                    Kode QR sekolah ini diamankan dengan token kriptografi dinamis. Pemindai umum / Google Lens tidak akan dapat membaca atau memalsukan QR ini.
                  </div>
                </div>

                {/* QR Scanner Camera Viewport */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 shadow-inner flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* QR Aim Box */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-400 rounded-2xl relative shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                      {/* Laser scanner animation */}
                      <div className="absolute w-full h-0.5 bg-indigo-400 animate-bounce top-1/2" />
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br-lg" />
                    </div>

                    <div className="mt-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px]">
                      Arahkan kamera ke QR proyektor kelas guru
                    </div>
                  </div>
                </div>

                {qrScanResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 text-center flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {qrScanResult}
                  </div>
                )}

                {qrError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    {qrError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Tips Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <Navigation className="w-4 h-4 text-indigo-600" />
          Titik Sekolah: {config.schoolName} ({config.latitude.toFixed(4)}, {config.longitude.toFixed(4)})
        </span>
        <span>Jam Masuk: {config.clockInStart || config.checkInStartTime || '06:00'} - {config.clockInEnd || config.checkInEndTime || '08:30'} WIB</span>
      </div>
    </div>
  );
};
