/**
 * Converts a base64 encoded string into a binary ArrayBuffer.
 * This is useful in React Native environments for file handling, 
 * such as uploading raw image data to Supabase Storage.
 *
 * @param base64 The base64 string to convert.
 * @returns The converted ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  const cleanBase64 = base64.replace(/=+$/, '');
  const len = cleanBase64.length;
  const bufferLength = Math.floor(len * 0.75);
  const bytes = new Uint8Array(bufferLength);
  
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[cleanBase64.charCodeAt(i)];
    const encoded2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const encoded3 = i + 2 < len ? lookup[cleanBase64.charCodeAt(i + 2)] : 0;
    const encoded4 = i + 3 < len ? lookup[cleanBase64.charCodeAt(i + 3)] : 0;
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }
  return bytes.buffer;
}
