import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, Check, RefreshCw, SwitchCamera, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { checkFaceAlignment, extractFaceDescriptor, FaceAlignmentResult } from '../utils/faceMatch';
import { soundFx } from '../utils/audio';

interface PrecisionFaceCaptureModalProps {
  isOpen: boolean;
  studentName?: string;
  onCapture: (photoDataUrl: string, faceDescriptor: number[]) => void;
  onClose: () => void;
}

export const PrecisionFaceCaptureModal: React.FC<PrecisionFaceCaptureModalProps> = ({
  isOpen,
  studentName,
  onCapture,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Alignment status
  const [alignment, setAlignment] = useState<FaceAlignmentResult>({
    isAligned: false,
    score: 0,
    horizontalOffset: 0,
    verticalOffset: 0,
    coverage: 0,
    message: 'Mempersiapkan kamera...'
  });

  // Captured snapshot preview
  const [capturedPreview, setCapturedPreview] = useState<{
    photoUrl: string;
    descriptor: number[];
  } | null>(null);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);

    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraLoading(false);
        };
      }
    } catch (err) {
      setCameraLoading(false);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && !capturedPreview) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera, capturedPreview]);

  // Real-time Face Alignment Analysis Loop
  useEffect(() => {
    if (!isOpen || capturedPreview) return;
    let animId: number;

    const runAnalysis = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        canvasRef.current
      ) {
        const v = videoRef.current;
        const c = canvasRef.current;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          c.width = v.videoWidth || 640;
          c.height = v.videoHeight || 480;
          ctx.drawImage(v, 0, 0, c.width, c.height);

          const result = checkFaceAlignment(ctx, c.width, c.height);
          setAlignment(result);
        }
      }
      animId = requestAnimationFrame(runAnalysis);
    };

    animId = requestAnimationFrame(runAnalysis);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, capturedPreview]);

  // Capture face snapshot
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    ctx.drawImage(v, 0, 0, c.width, c.height);

    // Crop face centered around oval target
    const cropW = Math.floor(c.width * 0.6);
    const cropH = Math.floor(c.height * 0.75);
    const cropX = Math.floor((c.width - cropW) / 2);
    const cropY = Math.floor((c.height - cropH) / 2);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = 400;
    cropCanvas.height = 400;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCtx.drawImage(c, cropX, cropY, cropW, cropH, 0, 0, 400, 400);

    const descriptor = extractFaceDescriptor(cropCanvas);
    const photoUrl = cropCanvas.toDataURL('image/jpeg', 0.9);

    soundFx.playCameraSnap();
    setCapturedPreview({ photoUrl, descriptor });
  };

  const handleConfirmPhoto = () => {
    if (capturedPreview) {
      soundFx.playSuccess();
      onCapture(capturedPreview.photoUrl, capturedPreview.descriptor);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Perekaman Biometrik Wajah Presisi
              </h3>
              <p className="text-[11px] text-slate-500">
                {studentName ? `Siswa: ${studentName}` : 'Posisikan wajah tepat di dalam oval panduan'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden analysis canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Viewport or Preview */}
        {!capturedPreview ? (
          <div className="relative aspect-4/3 w-full bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {cameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white gap-2 z-20">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-semibold">Mengaktifkan kamera biometrik...</span>
              </div>
            )}

            {cameraError ? (
              <div className="p-4 text-center text-rose-300 text-xs flex flex-col items-center gap-2">
                <AlertCircle className="w-7 h-7 text-rose-400" />
                <span>{cameraError}</span>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            )}

            {/* Precision Biometric Oval Guide Overlay */}
            {!cameraLoading && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Oval Target Frame */}
                <div
                  className={`w-[58%] h-[74%] rounded-[50%] border-2 transition-all duration-200 relative flex items-center justify-center ${
                    alignment.isAligned
                      ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] bg-emerald-500/10'
                      : 'border-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-black/15'
                  }`}
                >
                  {/* Eyeline guide */}
                  <div className="absolute w-[80%] h-px border-b border-dashed border-white/40 top-[38%]" />
                  {/* Center vertical guide */}
                  <div className="absolute h-[80%] w-px border-r border-dashed border-white/40 left-1/2" />

                  {/* Corner alignment markers */}
                  <div className="absolute top-2 w-4 h-4 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/80 rounded-br-sm" />

                  {alignment.isAligned && (
                    <div className="absolute -top-3 px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Posisi Pas (Siap Jepret)
                    </div>
                  )}
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                  className="pointer-events-auto absolute top-3 right-3 p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs transition-colors cursor-pointer"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Preview of Captured Face */
          <div className="space-y-3">
            <div className="relative aspect-square max-w-[260px] mx-auto rounded-3xl overflow-hidden border-2 border-emerald-400 shadow-lg bg-black">
              <img
                src={capturedPreview.photoUrl}
                alt="Wajah Terdaftar"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white py-1 px-2 text-center text-[10px] font-bold backdrop-blur-xs flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Biometrik Wajah Siap Disimpan
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Foto wajah telah dipindai dan profil biometrik telah dianalisis untuk pengenalan presisi.
            </p>
          </div>
        )}

        {/* Alignment Guidance Status Box */}
        {!capturedPreview && (
          <div
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-semibold transition-all ${
              alignment.isAligned
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-4 h-4 shrink-0 ${
                  alignment.isAligned ? 'text-emerald-600 animate-pulse' : 'text-amber-500'
                }`}
              />
              <span>{alignment.message}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/70">
              Presisi: {alignment.score}%
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-2 pt-1">
          {!capturedPreview ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSnap}
                disabled={cameraLoading || !!cameraError}
                className={`flex-1 py-2 px-3 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  alignment.isAligned
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Jepret Foto Wajah
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ulangi Jepret
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Gunakan Foto Ini
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
