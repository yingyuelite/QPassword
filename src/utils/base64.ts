// btoa polyfill for WeChat Mini Program (might not have native btoa)
export function btoa(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let result = ''
  let i = 0
  while (i < str.length) {
    const a = str.charCodeAt(i++)
    const b = i < str.length ? str.charCodeAt(i++) : 0
    const c = i < str.length ? str.charCodeAt(i++) : 0
    const triplet = (a << 16) | (b << 8) | c
    result += chars[(triplet >> 18) & 0x3F]
    result += chars[(triplet >> 12) & 0x3F]
    result += chars[(triplet >> 6) & 0x3F]
    result += chars[triplet & 0x3F]
  }
  // Add padding
  if (str.length % 3 === 1) {
    result = result.substring(0, result.length - 2) + '=='
  } else if (str.length % 3 === 2) {
    result = result.substring(0, result.length - 1) + '='
  }
  return result
}
