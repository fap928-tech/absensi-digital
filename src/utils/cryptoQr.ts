import QRCode from 'qrcode';

const PROTOCOL_HEADER = 'PROPRIETARY-EDU-ATTENDANCE-ENCRYPTED-V3::';

export interface DecryptedQrPayload {
  schoolId: string;
  className: string;
  timestamp: number;
  sessionId?: string;
  type: 'DYNAMIC_CLASS_ROOM' | 'STUDENT_CARD';
  studentId?: string;
  nisn?: string;
  name?: string;
}

/**
 * Custom lightweight reversible obfuscation/encryption using rotating key & XOR + Base64
 * Designed specifically so external scanners (Google Lens, Apple Camera) display unreadable raw tokens,
 * while this web absensi seamlessly decrypts and verifies the authentic school signature and student identity.
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(encodeURIComponent(result));
}

function xorDecrypt(base64Cipher: string, key: string): string {
  try {
    const text = decodeURIComponent(atob(base64Cipher));
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    throw new Error('Payload rusak atau tidak terenkripsi dengan format yang sah');
  }
}

/**
 * Generates an encrypted payload string that cannot be interpreted by generic QR readers
 */
export function generateEncryptedQrPayload(
  payload: DecryptedQrPayload,
  schoolSalt: string
): string {
  const jsonString = JSON.stringify(payload);
  const nonce = Math.floor(Math.random() * 1000000).toString(16);
  const combinedKey = `${schoolSalt}#${nonce}#EDU2026`;
  const encrypted = xorEncrypt(jsonString, combinedKey);

  return `${PROTOCOL_HEADER}${nonce}::${encrypted}`;
}

/**
 * Generates official Student ID Card encrypted payload
 */
export function generateStudentEncryptedQr(
  student: { id: string; nisn?: string; name: string; className?: string },
  schoolSalt: string
): string {
  const payload: DecryptedQrPayload = {
    schoolId: 'school_main_config',
    studentId: student.id,
    nisn: student.nisn,
    name: student.name,
    className: student.className || '',
    type: 'STUDENT_CARD',
    timestamp: Date.now()
  };
  return generateEncryptedQrPayload(payload, schoolSalt);
}

/**
 * Validates and decrypts an encrypted QR payload scanned within this app
 */
export function decryptAndValidateQrPayload(
  rawQrText: string,
  schoolSalt: string,
  maxAgeSeconds = 120
): DecryptedQrPayload {
  if (!rawQrText.startsWith(PROTOCOL_HEADER)) {
    throw new Error(
      'Kode QR tidak dikenali! Ini bukan QR resmi sistem absensi terenkripsi sekolah ini.'
    );
  }

  const parts = rawQrText.substring(PROTOCOL_HEADER.length).split('::');
  if (parts.length !== 2) {
    throw new Error('Format QR terenkripsi cacat.');
  }

  const [nonce, encrypted] = parts;
  const combinedKey = `${schoolSalt}#${nonce}#EDU2026`;

  let jsonStr = '';
  try {
    jsonStr = xorDecrypt(encrypted, combinedKey);
  } catch {
    throw new Error('Gagal mendekripsi QR. Kunci sekolah tidak cocok atau data korup.');
  }

  let parsed: DecryptedQrPayload;
  try {
    parsed = JSON.parse(jsonStr) as DecryptedQrPayload;
  } catch {
    throw new Error('Format data di dalam QR tidak valid.');
  }

  // Check timestamp expiration for dynamic class QR codes to prevent screenshot fraud
  if (parsed.type === 'DYNAMIC_CLASS_ROOM') {
    const now = Date.now();
    const ageSeconds = (now - parsed.timestamp) / 1000;
    if (ageSeconds > maxAgeSeconds) {
      throw new Error(
        `Kode QR telah kadaluarsa (${Math.round(ageSeconds)} detik lalu). Minta guru menyegarkan QR proyektor.`
      );
    }
  }

  return parsed;
}

/**
 * Generates high-contrast QR Code data URL image
 */
export async function generateQrDataUrl(
  encryptedText: string,
  width = 300
): Promise<string> {
  return QRCode.toDataURL(encryptedText, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width,
    color: {
      dark: '#1e1b4b',
      light: '#ffffff',
    },
  });
}
