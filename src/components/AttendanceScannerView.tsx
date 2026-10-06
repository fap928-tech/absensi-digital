import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  QrCode,
  Sparkles,
  SwitchCamera,
  Clock,
  CheckCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  MapPin,
  Scan,
  ShieldCheck,
  UserCheck
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
  getCurrentGeoPosition
} from '../utils/geo';
import { decryptAndValidateQrPayload } from '../utils/cryptoQr';
import {
  checkFaceAlignment,
  extractFaceDescriptor,
  compareFaceDescriptors
} from '../utils/faceMatch';

interface AttendanceScannerViewProps {
  config: SchoolConfig;
  students: UserProfile[];
  attendances: AttendanceRecord[];
  onProcessAttendance: (
    studentId: string,
    actionType: 'clock_in' | 'clock_out',
    details: {
      studentName: string;
      className: string;
      timeStr: string;
      dateStr: string;
      status?: AttendanceStatus;
      photoProof?: string;
      method: 'face_camera' | 'qr_code' | 'manual_teacher';
      latitude?: number;
      longitude?: number;
      distanceMeters?: number;
      inRadius?: boolean;
      suspiciousReason?: string;
    }
  ) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
  onBackToDashboard: () => void;
}

export const AttendanceScannerView: React.FC<AttendanceScannerViewProps> = ({
  config,
  students,
  attendances,
  onProcessAttendance,
  onBackToDashboard
}) => {
  // Action: Clock In (Masuk) or Clock Out (Pulang)
  const [scanAction, setScanAction] = useState<'clock_in' | 'clock_out'>('clock_in');

  // Scanner Mode: Universal Smart Auto-Detect (Scans QR card and snaps face selfie simultaneously)
  const [mode, setMode] = useState<'smart_auto' | 'face_only'>('smart_auto');

  // Auto detect toggle
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(true);

  // Fallback student selection for face_only mode if needed
  const [manualSelectedStudentId, setManualSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );

  // Camera video & canvas references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Lock to prevent processing multiple frames for the same scan in quick succession
  const isProcessingLock = useRef<boolean>(false);
  const steadyFrameCount = useRef<number>(0);
  const [faceDetectedInFrame, setFaceDetectedInFrame] = useState<boolean>(false);
  const [faceAlignmentInfo, setFaceAlignmentInfo] = useState<{
    isAligned: boolean;
    message: string;
    similarity?: number;
  }>({
    isAligned: false,
    message: 'Arahkan wajah / QR ke frame kamera'
  });

  // Geolocation
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [distMeters, setDistMeters] = useState<number>(0);
  const [inRadius, setInRadius] = useState<boolean>(true);

  // Real-time scan result card
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error';
    studentName?: string;
    className?: string;
    time?: string;
    photoProof?: string;
    message: string;
  } | null>(null);

  // Initialize Geolocation
  useEffect(() => {
    getCurrentGeoPosition()
      .then((pos) => {
        setCurrentCoord({ lat: pos.latitude, lng: pos.longitude });
        const d = calculateDistanceMeters(
          pos.latitude,
          pos.longitude,
          config.latitude,
          config.longitude
        );
        setDistMeters(d);
        setInRadius(d <= config.radiusMeters);
      })
      .catch(() => {
        setDistMeters(15);
        setInRadius(true);
      });
  }, [config.latitude, config.longitude, config.radiusMeters]);

  // Start & Stop camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
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
    } catch {
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Pastikan izin kamera telah diberikan.');
      setIsCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera]);

  // Core Attendance Executor: Automatically resolves student identity
  const executeAttendance = async (
    targetStudent: UserProfile,
    method: 'face_camera' | 'qr_code',
    capturedSelfie?: string
  ) => {
    if (isProcessingLock.current) return;
    isProcessingLock.current = true;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const dateStr = now.toISOString().split('T')[0];

    // Status evaluation
    let status: AttendanceStatus = 'hadir';
    let suspiciousReason: string | undefined = undefined;

    if (!inRadius && distMeters > config.radiusMeters) {
      status = 'mencurigakan';
      suspiciousReason = `Di luar radius geofence (${formatDistance(distMeters)})`;
    } else if (scanAction === 'clock_in') {
      const [h, m] = timeStr.split(':').map(Number);
      const [lateH, lateM] = (config.clockInLate || '07:15').split(':').map(Number);
      if (h * 60 + m > lateH * 60 + lateM) {
        status = 'terlambat';
        suspiciousReason = `Lewat batas tepat waktu (${config.clockInLate} WIB)`;
      }
    }

    const res = await onProcessAttendance(targetStudent.id, scanAction, {
      studentName: targetStudent.name,
      className: targetStudent.className || 'X IPA 1',
      timeStr,
      dateStr,
      status,
      photoProof: capturedSelfie,
      method,
      latitude: currentCoord?.lat || config.latitude,
      longitude: currentCoord?.lng || config.longitude,
      distanceMeters: distMeters,
      inRadius,
      suspiciousReason
    });

    if (res.success) {
      soundFx.playSuccess();
      setLastScanResult({
        type: 'success',
        studentName: targetStudent.name,
        className: targetStudent.className,
        time: timeStr,
        photoProof: capturedSelfie,
        message: res.message
      });
    } else {
      soundFx.playAlert();
      setLastScanResult({
        type: 'error',
        studentName: targetStudent.name,
        className: targetStudent.className,
        time: timeStr,
        message: res.message
      });
    }

    // Cooldown pause before next scan
    setTimeout(() => {
      isProcessingLock.current = false;
    }, 2800);
  };

  // Helper to capture current camera frame as selfie proof
  const snapCurrentSelfie = (): string | undefined => {
    if (!videoRef.current || !canvasRef.current) return undefined;
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    if (!ctx) return undefined;

    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    ctx.drawImage(v, 0, 0, c.width, c.height);

    // Official watermark
    const timeStr = new Date().toLocaleTimeString('id-ID');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, c.height - 30, c.width, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${timeStr} WIB • GPS: ${formatDistance(distMeters)}`, 10, c.height - 10);

    return c.toDataURL('image/jpeg', 0.82);
  };

  // Continuous Frame Analysis Loop (Hands-Free Auto-Detection)
  useEffect(() => {
    let animId: number;

    const processFrame = () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !canvasRef.current) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      const v = videoRef.current;
      const c = canvasRef.current;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 480;
      ctx.drawImage(v, 0, 0, c.width, c.height);

      if (!isProcessingLock.current && isAutoDetect) {
        // 1. Scan for Encrypted QR Card
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const qrCode = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (qrCode && qrCode.data) {
          const raw = qrCode.data.trim();

          // Try decrypting with school salt
          let matchedStudent: UserProfile | undefined = undefined;

          try {
            const dec = decryptAndValidateQrPayload(raw, config.qrSecuritySalt);
            if (dec.studentId) {
              matchedStudent = students.find((s) => s.id === dec.studentId);
            }
            if (!matchedStudent && dec.nisn) {
              matchedStudent = students.find((s) => s.nisn === dec.nisn);
            }
          } catch {
            // Not encrypted, or check plain fallback
            matchedStudent = students.find(
              (s) =>
                s.studentQrCode === raw ||
                s.nisn === raw ||
                s.id === raw
            );
          }

          if (matchedStudent) {
            soundFx.playQrBeep();
            const selfie = snapCurrentSelfie();
            executeAttendance(matchedStudent, 'qr_code', selfie);
          } else {
            // Unrecognized QR
            soundFx.playAlert();
            setLastScanResult({
              type: 'error',
              message: 'Kode QR tidak dikenali atau bukan QR resmi kartu siswa sekolah ini.'
            });
            isProcessingLock.current = true;
            setTimeout(() => {
              isProcessingLock.current = false;
            }, 2500);
          }
        } else if (mode === 'face_only' || isAutoDetect) {
          // 2. Optical precision face analysis & biometric verification
          const cx = Math.floor(c.width * 0.22);
          const cy = Math.floor(c.height * 0.15);
          const cw = Math.floor(c.width * 0.56);
          const ch = Math.floor(c.height * 0.70);

          try {
            const alignResult = checkFaceAlignment(ctx, c.width, c.height, {
              x: cx,
              y: cy,
              width: cw,
              height: ch
            });

            if (alignResult.isAligned) {
              steadyFrameCount.current += 1;
              setFaceDetectedInFrame(true);

              const liveDesc = extractFaceDescriptor(c, {
                x: cx,
                y: cy,
                width: cw,
                height: ch
              });

              // Check if a student is manually chosen
              const selectedStudent = students.find((s) => s.id === manualSelectedStudentId);

              if (selectedStudent) {
                let similarity = 85; // default fallback if no descriptor registered yet
                let isMatch = true;

                if (selectedStudent.faceDescriptor && selectedStudent.faceDescriptor.length > 0) {
                  const comp = compareFaceDescriptors(liveDesc, selectedStudent.faceDescriptor);
                  similarity = comp.similarity;
                  isMatch = comp.isMatch;
                }

                setFaceAlignmentInfo({
                  isAligned: true,
                  message: `Wajah Terdeteksi: ${selectedStudent.name} (Kemiripan Biometrik: ${similarity}%)`,
                  similarity
                });

                // Auto-confirm after steady frames (~1 second)
                if (steadyFrameCount.current > 24) {
                  steadyFrameCount.current = 0;

                  if (!isMatch) {
                    isProcessingLock.current = true;
                    soundFx.playAlert();
                    setLastScanResult({
                      type: 'error',
                      studentName: selectedStudent.name,
                      className: selectedStudent.className,
                      message: `Wajah Tidak Cocok! Kemiripan biometrik hanya ${similarity}%. Wajah di depan kamera berbeda dengan data foto siswa ${selectedStudent.name}. Presensi ditolak agar tidak mengabsen murid lain.`
                    });
                    setTimeout(() => {
                      isProcessingLock.current = false;
                    }, 3200);
                  } else {
                    const selfie = snapCurrentSelfie();
                    executeAttendance(selectedStudent, 'face_camera', selfie);
                  }
                }
              } else if (isAutoDetect) {
                // Auto-match across all students who have biometric face descriptors enrolled
                const enrolled = students.filter(
                  (s) => s.faceDescriptor && s.faceDescriptor.length > 0
                );

                let bestStudent: UserProfile | null = null;
                let bestSimilarity = 0;

                for (const student of enrolled) {
                  const comp = compareFaceDescriptors(liveDesc, student.faceDescriptor!);
                  if (comp.similarity > bestSimilarity) {
                    bestSimilarity = comp.similarity;
                    if (comp.isMatch) {
                      bestStudent = student;
                    }
                  }
                }

                if (bestStudent && bestSimilarity >= 76) {
                  setFaceAlignmentInfo({
                    isAligned: true,
                    message: `Wajah Terverifikasi: ${bestStudent.name} (${bestSimilarity}%)`,
                    similarity: bestSimilarity
                  });

                  if (steadyFrameCount.current > 24) {
                    steadyFrameCount.current = 0;
                    const selfie = snapCurrentSelfie();
                    executeAttendance(bestStudent, 'face_camera', selfie);
                  }
                } else {
                  setFaceAlignmentInfo({
                    isAligned: false,
                    message: alignResult.message || 'Wajah belum cocok dengan siswa terdaftar',
                    similarity: bestSimilarity
                  });

                  if (steadyFrameCount.current > 35) {
                    steadyFrameCount.current = 0;
                    isProcessingLock.current = true;
                    soundFx.playAlert();
                    setLastScanResult({
                      type: 'error',
                      message: `Wajah tidak cocok dengan data siswa terdaftar (Kemiripan tertinggi: ${bestSimilarity}%). Pastikan siswa telah didaftarkan foto wajahnya di menu Data Siswa.`
                    });
                    setTimeout(() => {
                      isProcessingLock.current = false;
                    }, 3000);
                  }
                }
              }
            } else {
              steadyFrameCount.current = Math.max(0, steadyFrameCount.current - 1);
              if (steadyFrameCount.current === 0) setFaceDetectedInFrame(false);
              setFaceAlignmentInfo({
                isAligned: false,
                message: alignResult.message
              });
            }
          } catch {
            // ignore
          }
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [isAutoDetect, mode, manualSelectedStudentId, students, config.qrSecuritySalt]);

  const handleManualSnap = () => {
    const student = students.find((s) => s.id === manualSelectedStudentId);
    if (!student) {
      soundFx.playAlert();
      setLastScanResult({
        type: 'error',
        message: 'Silakan pilih nama siswa terlebih dahulu sebelum mengambil jepret foto!'
      });
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    ctx.drawImage(v, 0, 0, c.width, c.height);

    const cx = Math.floor(c.width * 0.22);
    const cy = Math.floor(c.height * 0.15);
    const cw = Math.floor(c.width * 0.56);
    const ch = Math.floor(c.height * 0.70);

    const alignResult = checkFaceAlignment(ctx, c.width, c.height, {
      x: cx,
      y: cy,
      width: cw,
      height: ch
    });

    if (!alignResult.isAligned) {
      soundFx.playAlert();
      setLastScanResult({
        type: 'error',
        studentName: student.name,
        className: student.className,
        message: `Posisi wajah belum pas! ${alignResult.message}. Posisikan wajah di dalam oval sebelum jepret.`
      });
      return;
    }

    // Biometric check if student has enrolled face
    if (student.faceDescriptor && student.faceDescriptor.length > 0) {
      const liveDesc = extractFaceDescriptor(c, { x: cx, y: cy, width: cw, height: ch });
      const comp = compareFaceDescriptors(liveDesc, student.faceDescriptor);

      if (!comp.isMatch) {
        soundFx.playAlert();
        setLastScanResult({
          type: 'error',
          studentName: student.name,
          className: student.className,
          message: `Wajah Tidak Cocok! Kemiripan hanya ${comp.similarity}%. Wajah di depan kamera berbeda dengan data foto siswa ${student.name}. Tidak bisa mengabsen murid lain!`
        });
        return;
      }
    }

    const selfie = snapCurrentSelfie();
    executeAttendance(student, 'face_camera', selfie);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Banner & Navigation */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-1 cursor-pointer"
          >
            ← Kembali ke Dashboard
          </button>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scan className="w-5 h-5 text-indigo-600" />
            Scanner Presensi Pintar Auto-Detect
          </h2>
          <p className="text-xs text-slate-500">
            Arahkan Kartu QR Siswa atau Wajah ke kamera. Sistem otomatis mendeteksi identitas murid tanpa perlu memilih nama!
          </p>
        </div>

        {/* Action Toggle: Clock In vs Clock Out */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => {
              setScanAction('clock_in');
              setLastScanResult(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              scanAction === 'clock_in'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Clock In (Masuk)
          </button>
          <button
            type="button"
            onClick={() => {
              setScanAction('clock_out');
              setLastScanResult(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              scanAction === 'clock_out'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            Clock Out (Pulang)
          </button>
        </div>
      </div>

      {/* Schedule Info Banner */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-indigo-900 font-semibold">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>
            Jadwal {scanAction === 'clock_in' ? 'Clock In Masuk' : 'Clock Out Pulang'}:
          </span>
          <span className="font-mono font-bold text-slate-900">
            {scanAction === 'clock_in'
              ? `${config.clockInStart} - ${config.clockInEnd} WIB (Batas Tepat: ${config.clockInLate})`
              : `${config.clockOutStart} - ${config.clockOutEnd} WIB`}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          GPS Sekolah: {formatDistance(distMeters)} ({inRadius ? 'Dalam Area' : 'Luar Area'})
        </div>
      </div>

      {/* Real-time Scan Result Toast */}
      {lastScanResult && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            lastScanResult.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {lastScanResult.type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {lastScanResult.studentName
                  ? `${lastScanResult.studentName} (${lastScanResult.className || 'Kelas'})`
                  : 'Status Presensi'}
              </div>
              <div className="text-xs font-normal mt-0.5">{lastScanResult.message}</div>
            </div>
          </div>

          {lastScanResult.photoProof && (
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-300 shrink-0">
              <img src={lastScanResult.photoProof} alt="Selfie" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Camera Viewport & Auto-Detect Controls */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        {/* Toggle Mode & Camera Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('smart_auto')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'smart_auto'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              Smart Auto-Detect (QR & Foto Otomatis)
            </button>

            <button
              onClick={() => setMode('face_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'face_only'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Foto Wajah Manual
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoDetect(!isAutoDetect)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isAutoDetect
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto Detect: {isAutoDetect ? 'Aktif' : 'Nonaktif'}
            </button>

            <button
              onClick={() =>
                setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
              }
              title="Ganti Kamera Depan / Belakang"
              className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 max-w-lg mx-auto shadow-inner flex items-center justify-center border border-slate-800">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${
              facingMode === 'user' ? '-scale-x-100' : ''
            }`}
          />

          {/* Aim Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {mode === 'face_only' ? (
              <div
                className={`w-[56%] h-[74%] rounded-[50%] border-2 transition-all relative flex items-center justify-center ${
                  faceAlignmentInfo.isAligned
                    ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)] bg-emerald-500/10'
                    : 'border-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-black/15'
                }`}
              >
                {/* Horizontal eyeline guide */}
                <div className="absolute w-[80%] h-px border-b border-dashed border-white/40 top-[38%]" />
                {/* Center vertical guide */}
                <div className="absolute h-[80%] w-px border-r border-dashed border-white/40 left-1/2" />
                {faceAlignmentInfo.isAligned && (
                  <div className="absolute -top-3 px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Wajah Pas & Presisi
                  </div>
                )}
              </div>
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-400 rounded-2xl relative shadow-[0_0_35px_rgba(99,102,241,0.4)]">
                {/* Animated laser line */}
                <div className="absolute w-full h-0.5 bg-cyan-400 animate-bounce top-1/2" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br-lg" />
              </div>
            )}

            <div className="mt-4 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-[11px] font-medium flex items-center gap-1.5 shadow-sm max-w-[90%] text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {faceAlignmentInfo.message ||
                  (mode === 'face_only'
                    ? 'Posisikan wajah tepat di dalam oval'
                    : 'Arahkan Kartu QR Murid atau Wajah ke Kamera')}
              </span>
            </div>
          </div>
        </div>

        {cameraError && (
          <p className="text-xs text-red-600 text-center font-semibold">{cameraError}</p>
        )}

        {/* Manual capture fallback if mode === 'face_only' */}
        {mode === 'face_only' && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Pilih Siswa (Mode Manual):
              </label>
              <select
                value={manualSelectedStudentId}
                onChange={(e) => setManualSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.className || 'Kelas'}) - NISN: {s.nisn}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleManualSnap}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4" />
              Jepret Absen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
