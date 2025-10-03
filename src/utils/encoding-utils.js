function resolveRelativeUrl(base, relativePath) {
  try {
    const baseUrl = base instanceof URL ? base : new URL(base, window.location.href);
    return new URL(relativePath, baseUrl).toString();
  } catch (error) {
    console.warn("Could not resolve relative URL:", relativePath, error);
    return null;
  }
}

function decodeBase64ToUint8Array(base64) {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer === "function") {
    return Uint8Array.from(Buffer.from(base64, "base64"));
  }
  throw new Error("Base64 decoding is not available in this environment.");
}

function float16ToFloat32(value) {
  const sign = (value & 0x8000) >> 15;
  const exponent = (value & 0x7c00) >> 10;
  const fraction = value & 0x03ff;

  let result;
  if (exponent === 0) {
    if (fraction === 0) {
      result = 0;
    } else {
      result = (fraction / 0x400) * Math.pow(2, -14);
    }
  } else if (exponent === 0x1f) {
    result = fraction === 0 ? Number.POSITIVE_INFINITY : Number.NaN;
  } else {
    result = (1 + fraction / 0x400) * Math.pow(2, exponent - 15);
  }

  return sign === 1 ? -result : result;
}

function decodeFloat16Base64(base64, expectedLength) {
  const bytes = decodeBase64ToUint8Array(base64);
  if (bytes.byteLength % 2 !== 0) {
    throw new Error("Float16 data has an invalid length.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = bytes.byteLength / 2;
  if (Number.isFinite(expectedLength) && expectedLength > 0 && length !== expectedLength) {
    throw new Error(
      `Expected ${expectedLength} Float16 values, but received ${length}.`,
    );
  }
  const result = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const half = view.getUint16(index * 2, true);
    result[index] = float16ToFloat32(half);
  }
  return result;
}

function decodeWeightMatrix(encoded, shape) {
  const rows = Math.max(0, Number(shape?.[0]) || 0);
  const cols = Math.max(0, Number(shape?.[1]) || 0);
  if (rows === 0 || cols === 0) {
    return [];
  }
  const flat = decodeFloat16Base64(encoded, rows * cols);
  const result = [];
  for (let row = 0; row < rows; row += 1) {
    const start = row * cols;
    const end = start + cols;
    result.push(flat.slice(start, end));
  }
  return result;
}

export { resolveRelativeUrl, decodeBase64ToUint8Array, float16ToFloat32, decodeFloat16Base64, decodeWeightMatrix };
