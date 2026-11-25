/**
 * Minimal WebP header check, so the server does not need a native image
 * library (sharp) to confirm an upload really is a WebP image and read its size.
 * Supports the three WebP container forms: lossy (VP8), lossless (VP8L) and
 * extended (VP8X).
 */
export type WebpInfo = { width: number; height: number };

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

export function readWebpInfo(input: Uint8Array): WebpInfo | null {
  const bytes = input;
  if (bytes.length < 30) return null;
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riffSize = view.getUint32(4, true);
  if (riffSize + 8 > bytes.length + 1 || riffSize < 22) return null;

  const chunk = ascii(bytes, 12, 4);
  let width = 0;
  let height = 0;

  if (chunk === "VP8 ") {
    // Key frame start code 0x9d 0x01 0x2a, then 14-bit width and height.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    width = view.getUint16(26, true) & 0x3fff;
    height = view.getUint16(28, true) & 0x3fff;
  } else if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    width = 1 + (b0 | ((b1 & 0x3f) << 8));
    height = 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10));
  } else if (chunk === "VP8X") {
    width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
  } else {
    return null;
  }

  if (!width || !height) return null;
  return { width, height };
}
