import { Password } from '@/types/password'
import { Backup, defaultBackup } from '@/types/backup'
import { aesGcmEncrypt } from './crypto'
import { loadPasscode } from './storage'

export interface ExportData {
  jsonStr: string
  fileName: string
}

export async function prepareExportData(
  passwords: Password[],
  encrypt: boolean
): Promise<ExportData> {
  let exportData: Backup

  if (encrypt) {
    const passcode = await loadPasscode()
    const cipherText = await aesGcmEncrypt(JSON.stringify(passwords))
    if (!cipherText) {
      throw new Error('加密失败')
    }
    exportData = {
      ...defaultBackup,
      passcode,
      passwords: cipherText,
    }
  } else {
    exportData = {
      ...defaultBackup,
      passcode: null,
      passwords,
    }
  }

  const jsonStr = JSON.stringify(exportData, null, 2)
  const fileName = generateExportFileName()

  return { jsonStr, fileName }
}

export function generateExportFileName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `QPassword_passwords_${year}${month}${day}${hours}${minutes}.qp2`
}
