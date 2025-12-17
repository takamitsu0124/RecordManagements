import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config' // Firebase Storageインスタンスをインポート

/**
 * Firebase Storageにファイルをアップロードし、ダウンロードURLを返します。
 * @param file アップロードするファイル
 * @param path アップロード先のパス (例: `guild_logos/{guildId}/`)
 * @param fileName ファイル名 (オプション、指定しない場合は元のファイル名を使用)
 * @returns ダウンロードURL
 */
export async function uploadFile(file: File, path: string, fileName?: string): Promise<string> {
  const fileRef = ref(storage, `${path}/${fileName || file.name}`)
  console.log('Firebase Storage Upload Path:', fileRef.fullPath); // 追加
  const snapshot = await uploadBytes(fileRef, file)
  const downloadURL = await getDownloadURL(snapshot.ref)
  return downloadURL
}

/**
 * Firebase Storageからファイルを削除します。
 * @param fileUrl 削除するファイルのダウンロードURL
 */
export async function deleteFileByUrl(fileUrl: string): Promise<void> {
  const fileRef = ref(storage, fileUrl) // ダウンロードURLから参照を作成
  await deleteObject(fileRef)
}

/**
 * Firebase Storageから指定されたパスのファイルを削除します。
 * @param path 削除するファイルのパス (例: `guild_logos/{guildId}/{fileName}`)
 */
export async function deleteFileByPath(path: string): Promise<void> {
  const fileRef = ref(storage, path)
  await deleteObject(fileRef)
}
