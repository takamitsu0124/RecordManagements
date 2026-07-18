/**
 * Storageの転送量（Egress）コスト対策として、アップロード前にブラウザ上で
 * 画像を用途に応じた上限サイズへリサイズ・再圧縮するためのユーティリティ。
 * Canvas API のみで完結させ、追加の外部依存は導入しない。
 */

export interface ImageResizeOptions {
  /** リサイズ後の最大幅(px) */
  maxWidth: number
  /** リサイズ後の最大高さ(px) */
  maxHeight: number
  /** JPEG/WebPの再エンコード品質(0〜1)。省略時は0.85 */
  quality?: number
}

const RESIZABLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const WEBP_MIME_TYPE = 'image/webp'

// Canvas から WebP へのエンコードに対応しているかはブラウザ依存
// (例: Safari は WebP のデコードには対応していても toBlob('image/webp') では
// 非対応/別形式にフォールバックすることがある)。判定結果はセッション内で使い回す。
let webpEncodeSupportPromise: Promise<boolean> | null = null

function detectWebpEncodeSupport(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return Promise.resolve(false)
  }

  if (!webpEncodeSupportPromise) {
    webpEncodeSupportPromise = new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        canvas.toBlob(
          (blob) => resolve(!!blob && blob.type === WEBP_MIME_TYPE),
          WEBP_MIME_TYPE
        )
      } catch {
        resolve(false)
      }
    })
  }

  return webpEncodeSupportPromise
}

/**
 * 画像ファイルを指定サイズ以内にリサイズし、可能であればWebPへ変換します。
 * - ブラウザ環境でない場合、対応していない画像形式の場合、
 *   リサイズもWebP変換も不要な場合は元のファイルをそのまま返します。
 * - WebPへのエンコードに非対応のブラウザでは、元の形式のまま
 *   リサイズのみ行います(フォーマット変換は行いません)。
 */
export async function resizeImageFile(
  file: File,
  options: ImageResizeOptions
): Promise<File> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return file
  }

  if (!RESIZABLE_MIME_TYPES.has(file.type)) {
    return file
  }

  const { maxWidth, maxHeight, quality = 0.85 } = options
  const canEncodeWebp = await detectWebpEncodeSupport()
  const outputType = canEncodeWebp ? WEBP_MIME_TYPE : file.type
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const { width, height } = calculateTargetSize(
      image.width,
      image.height,
      maxWidth,
      maxHeight
    )

    const needsResize = width < image.width || height < image.height
    const needsFormatConversion = outputType !== file.type

    // リサイズもフォーマット変換も不要な場合は、再エンコードによる劣化を避けて
    // 元ファイルをそのまま使う
    if (!needsResize && !needsFormatConversion) {
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      return file
    }

    context.drawImage(image, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, outputType, quality)
    if (
      !blob ||
      (outputType === WEBP_MIME_TYPE && blob.type !== WEBP_MIME_TYPE)
    ) {
      return file
    }

    return new File([blob], file.name, {
      type: blob.type,
      lastModified: Date.now()
    })
  } catch {
    // 変換に失敗した場合は元ファイルのままアップロードを継続する
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('Failed to load image for resizing.'))
    image.src = src
  })
}

function calculateTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight)
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale)
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
