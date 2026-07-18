import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import { storage } from '../config' // Firebase Storageインスタンスをインポート
import { resizeImageFile, type ImageResizeOptions } from './resizeImage'

// Storageの転送量(Egress)コスト対策: 一覧・サムネイル表示に対して原寸画像が
// 配信されないよう、アップロード用途ごとの上限サイズをここで定義する。
export const GUILD_LOGO_IMAGE_RESIZE_OPTIONS: ImageResizeOptions = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.85
}

export const BANNER_IMAGE_RESIZE_OPTIONS: ImageResizeOptions = {
  maxWidth: 1600,
  maxHeight: 900,
  quality: 0.85
}

// scripts/skill-master/upload-images.mjs のオフラインアップロードと同じ
// サイズ方針(サムネイルは320px)に揃える。管理画面からの直接アップロードは
// skill-master/source-images/{equipmentType}/{skillId}-source.*|-thumb.webp に保存する。
export const SKILL_MASTER_IMAGE_RESIZE_OPTIONS: ImageResizeOptions = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.85
}

export const SKILL_MASTER_THUMBNAIL_RESIZE_OPTIONS: ImageResizeOptions = {
  maxWidth: 320,
  maxHeight: 320,
  quality: 0.8
}

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

/**
 * リサイズ処理でファイル形式が変わった場合(例: WebPへの変換)に、
 * アップロード先のファイル名の拡張子を実際のMIMEタイプへ合わせて置き換える。
 */
function resolveUploadFileName(
  baseFileName: string,
  uploadedFile: File
): string {
  const extension = EXTENSION_BY_MIME_TYPE[uploadedFile.type]
  if (!extension) {
    return baseFileName
  }

  const dotIndex = baseFileName.lastIndexOf('.')
  const nameWithoutExtension =
    dotIndex > 0 ? baseFileName.slice(0, dotIndex) : baseFileName
  return `${nameWithoutExtension}.${extension}`
}

/**
 * Firebase Storageにファイルをアップロードし、ダウンロードURLを返します。
 * @param file アップロードするファイル
 * @param path アップロード先のパス (例: `guild_logos/{guildId}/`)
 * @param fileName ファイル名 (オプション、指定しない場合は元のファイル名を使用)
 * @param resizeOptions 指定した場合、アップロード前にこのサイズ以内へリサイズ・再圧縮する
 * @returns ダウンロードURL
 */
export async function uploadFile(
  file: File,
  path: string,
  fileName?: string,
  resizeOptions?: ImageResizeOptions
): Promise<string> {
  const fileToUpload = resizeOptions
    ? await resizeImageFile(file, resizeOptions)
    : file
  const targetFileName = resolveUploadFileName(
    fileName || file.name,
    fileToUpload
  )
  const fileRef = ref(storage, `${path}/${targetFileName}`)
  const snapshot = await uploadBytes(fileRef, fileToUpload, {
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: fileToUpload.type
  })
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
