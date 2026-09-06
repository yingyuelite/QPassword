/**
 * UTF-8 string to Uint8Array
 */
export function utf8Encode(str: string): Uint8Array {
  const result: number[] = []
  let i = 0
  const len = str.length
  while (i < len) {
    const charCode = str.charCodeAt(i)
    if (charCode < 0x80) {
      result.push(charCode)
      i++
    } else if (charCode < 0x800) {
      result.push(0xC0 | (charCode >> 6))
      result.push(0x80 | (charCode & 0x3F))
      i++
    } else if (charCode < 0xD800 || charCode >= 0xE000) {
      result.push(0xE0 | (charCode >> 12))
      result.push(0x80 | ((charCode >> 6) & 0x3F))
      result.push(0x80 | (charCode & 0x3F))
      i++
    } else {
      const highSurrogate = charCode
      const lowSurrogate = str.charCodeAt(i + 1)
      const codePoint = ((highSurrogate & 0x3FF) << 10) | (lowSurrogate & 0x3FF) + 0x10000
      result.push(0xF0 | (codePoint >> 18))
      result.push(0x80 | ((codePoint >> 12) & 0x3F))
      result.push(0x80 | ((codePoint >> 6) & 0x3F))
      result.push(0x80 | (codePoint & 0x3F))
      i += 2
    }
  }
  return new Uint8Array(result)
}

/**
 * Uint8Array to UTF-8 string
 */
export function utf8Decode(bytes: Uint8Array): string {
  const result: string[] = []
  let i = 0
  const len = bytes.length
  while (i < len) {
    const byte1 = bytes[i]
    if (byte1 < 0x80) {
      result.push(String.fromCharCode(byte1))
      i++
    } else if (byte1 < 0xE0) {
      const byte2 = bytes[i + 1]
      const charCode = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F)
      result.push(String.fromCharCode(charCode))
      i += 2
    } else if (byte1 < 0xF0) {
      const byte2 = bytes[i + 1]
      const byte3 = bytes[i + 2]
      const charCode = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F)
      result.push(String.fromCharCode(charCode))
      i += 3
    } else {
      const byte2 = bytes[i + 1]
      const byte3 = bytes[i + 2]
      const byte4 = bytes[i + 3]
      const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F)
      const highSurrogate = ((codePoint - 0x10000) >> 10) + 0xD800
      const lowSurrogate = ((codePoint - 0x10000) & 0x3FF) + 0xDC00
      result.push(String.fromCharCode(highSurrogate, lowSurrogate))
      i += 4
    }
  }
  return result.join('')
}
