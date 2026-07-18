import { createHmac } from 'crypto'
import { getApps, initializeApp } from 'firebase-admin/app'
import {
  getFirestore,
  Timestamp,
  type Firestore
} from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { error as logError, info as logInfo } from 'firebase-functions/logger'
import { defineSecret } from 'firebase-functions/params'

const discordWebhookUrl = defineSecret('DISCORD_WEBHOOK_URL')
const DISCORD_CONTENT_LIMIT = 2000
const DISCORD_USERNAME_LIMIT = 80

if (getApps().length === 0) {
  initializeApp()
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()

  return normalizedValue.length > 0 ? normalizedValue : null
}

const getContent = (value: unknown): string => {
  const content = normalizeString(value)

  if (!content) {
    throw new HttpsError('invalid-argument', 'content is required.')
  }

  if (content.length > DISCORD_CONTENT_LIMIT) {
    throw new HttpsError(
      'invalid-argument',
      `content must be ${DISCORD_CONTENT_LIMIT} characters or fewer.`
    )
  }

  return content
}

const getUsername = (value: unknown): string | undefined => {
  const username = normalizeString(value)

  if (!username) {
    return undefined
  }

  return username.slice(0, DISCORD_USERNAME_LIMIT)
}

export const sendDiscordMessage = onCall<
  { content?: unknown; username?: unknown },
  Promise<{ ok: true }>
>(
  {
    region: 'asia-northeast1',
    secrets: [discordWebhookUrl]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication is required.')
    }

    const webhookUrl = normalizeString(discordWebhookUrl.value())

    if (!webhookUrl) {
      throw new HttpsError(
        'failed-precondition',
        'DISCORD_WEBHOOK_URL secret is not configured.'
      )
    }

    const content = getContent(request.data.content)
    const username = getUsername(request.data.username)
    const payload: {
      content: string
      username?: string
      allowed_mentions: {
        parse: string[]
      }
    } = {
      content,
      allowed_mentions: {
        parse: []
      }
    }

    if (username) {
      payload.username = username
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const responseText = await response.text()

      logError('Discord webhook returned a non-success response', {
        status: response.status,
        responseText
      })

      throw new HttpsError('internal', 'Failed to send the Discord message.')
    }

    return {
      ok: true
    }
  }
)

// Storageの帯域コスト対策: 手動アップロード(Firebase Console/gsutil)やアプリ経由の
// アップロードなど、経路を問わず全ての新規オブジェクトにCache-Controlを強制する。
// 既にmax-ageが設定済みのオブジェクトはスキップし、setMetadataはfinalizeイベントを
// 再発火させないため無限ループにはならない。
const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export const normalizeUploadedObjectCacheControl = onObjectFinalized(
  { region: 'asia-northeast1' },
  async (event) => {
    const { bucket: bucketName, name: objectName, cacheControl } = event.data

    if (!objectName || cacheControl?.includes('max-age')) {
      return
    }

    try {
      await getStorage().bucket(bucketName).file(objectName).setMetadata({
        cacheControl: DEFAULT_CACHE_CONTROL
      })

      logInfo('Applied default Cache-Control to uploaded object', {
        bucket: bucketName,
        object: objectName
      })
    } catch (error) {
      logError('Failed to set Cache-Control on uploaded object', {
        bucket: bucketName,
        object: objectName,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
)

// Storage配信コスト対策(Issue #91/#92): banner_master/ は機密性のない公開アセット
// のため、クライアントからのアップロード完了をトリガーに Cloud CDN 用の専用公開
// バケットへミラーリングし、Firestore の imageUrl を CDN 経由のURLへ更新する。
// これによりアプリ側のアップロードコード(RMBannerMasterAdmin.vue)は変更不要。
const PUBLIC_TIER_BUCKET_NAME = 'skill-master-images-public'
const PUBLIC_TIER_CDN_ORIGIN = 'https://136-69-19-129.sslip.io'
const PUBLIC_TIER_PREFIX = 'banner_master/'

export const mirrorBannerMasterAssetToCdnBucket = onObjectFinalized(
  { region: 'asia-northeast1' },
  async (event) => {
    const { name: objectName } = event.data

    if (!objectName || !objectName.startsWith(PUBLIC_TIER_PREFIX)) {
      return
    }

    const bannerId = objectName.split('/')[1]

    if (!bannerId) {
      return
    }

    try {
      const sourceBucket = getStorage().bucket(event.data.bucket)
      const destinationBucket = getStorage().bucket(PUBLIC_TIER_BUCKET_NAME)

      await sourceBucket
        .file(objectName)
        .copy(destinationBucket.file(objectName), {
          metadata: { cacheControl: DEFAULT_CACHE_CONTROL }
        })

      const cdnUrl = `${PUBLIC_TIER_CDN_ORIGIN}/${objectName}`

      await getFirestore()
        .collection('banner_master')
        .doc(bannerId)
        .set({ imageUrl: cdnUrl }, { merge: true })

      logInfo('Mirrored banner_master asset to CDN bucket', {
        object: objectName,
        cdnUrl
      })
    } catch (error) {
      logError('Failed to mirror banner_master asset to CDN bucket', {
        object: objectName,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
)

// Storage配信コスト対策(Issue #91/#92 skill_master拡張): skill-master/source-images/ も
// banner_master/ と同じく機密性のない公開アセット(スキルアイコン)のため、
// アップロード完了をトリガーに公開CDN専用バケットへミラーリングし、
// Firestore の skill_master/{skillId} の image/imageThumb を CDN URL へ更新する。
// これによりRMSkillMasterAdmin.vue管理画面からの直接アップロードにも対応する。
// 装備種別(equipmentType)ごとのフォルダに複数スキルの画像が混在するため、
// ファイル名に skillId を埋め込む命名規則({skillId}-source.*/{skillId}-thumb.webp)
// で管理し、旧OCR解析用に同じルート配下へ置かれていたファイル(この命名規則に
// 一致しないもの)は何もせずスキップする。
const SKILL_MASTER_IMAGE_PREFIX = 'skill-master/source-images/'
const SKILL_MASTER_THUMB_SUFFIX = '-thumb.webp'
const SKILL_MASTER_SOURCE_SUFFIX_PATTERN = /-source\.[^./]+$/

export const mirrorSkillMasterImageToCdnBucket = onObjectFinalized(
  { region: 'asia-northeast1' },
  async (event) => {
    const { name: objectName } = event.data

    if (!objectName || !objectName.startsWith(SKILL_MASTER_IMAGE_PREFIX)) {
      return
    }

    const fileName = objectName.split('/').pop() ?? ''

    let skillId = ''
    let fieldName: 'image' | 'imageThumb' | null = null

    if (fileName.endsWith(SKILL_MASTER_THUMB_SUFFIX)) {
      skillId = fileName.slice(0, -SKILL_MASTER_THUMB_SUFFIX.length)
      fieldName = 'imageThumb'
    } else if (SKILL_MASTER_SOURCE_SUFFIX_PATTERN.test(fileName)) {
      skillId = fileName.replace(SKILL_MASTER_SOURCE_SUFFIX_PATTERN, '')
      fieldName = 'image'
    }

    if (!skillId || !fieldName) {
      return
    }

    try {
      const sourceBucket = getStorage().bucket(event.data.bucket)
      const destinationBucket = getStorage().bucket(PUBLIC_TIER_BUCKET_NAME)

      await sourceBucket
        .file(objectName)
        .copy(destinationBucket.file(objectName), {
          metadata: { cacheControl: DEFAULT_CACHE_CONTROL }
        })

      const cdnUrl = `${PUBLIC_TIER_CDN_ORIGIN}/${objectName}`

      await getFirestore()
        .collection('skill_master')
        .doc(skillId)
        .set({ [fieldName]: cdnUrl }, { merge: true })

      logInfo('Mirrored skill_master image to CDN bucket', {
        object: objectName,
        cdnUrl,
        fieldName
      })
    } catch (error) {
      logError('Failed to mirror skill_master image to CDN bucket', {
        object: objectName,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
)

// Storage配信コスト対策(Issue #91/#93): guild_logos/ 等の非公開系プレフィックスは
// storage.rules と同等の認可判定をAdmin SDKで行い、認可されたリクエストにのみ
// 短命なCloud CDN署名付きURLを発行する。署名鍵はSecret Managerに保管し、
// クライアントは本関数からURLを取得してから画像を表示する(直接Storageの
// ダウンロードURLは使用しない)。
const privateTierCdnSigningKey = defineSecret('PRIVATE_TIER_CDN_SIGNING_KEY')
const PRIVATE_TIER_CDN_ORIGIN = 'https://136-69-19-129.sslip.io'
const PRIVATE_TIER_SIGNING_KEY_NAME = 'private-tier-key-1'
const PRIVATE_TIER_SIGNED_URL_TTL_SECONDS = 15 * 60
const PRIVATE_TIER_GUILD_PREFIX = 'guild_logos'
const PRIVATE_TIER_PERSONAL_PREFIXES = [
  'skill_records',
  'profile_images',
  'user_images',
  'mypage_images'
] as const
const PRIVATE_TIER_PREFIXES = [
  PRIVATE_TIER_GUILD_PREFIX,
  ...PRIVATE_TIER_PERSONAL_PREFIXES
] as const

const decodeBase64Url = (value: string): Buffer => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64')
}

const encodeBase64Url = (buffer: Buffer): string => {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

const signCdnUrl = (
  url: string,
  keyName: string,
  rawKey: Buffer,
  expiresAtSeconds: number
): string => {
  const separator = url.includes('?') ? '&' : '?'
  const urlToSign = `${url}${separator}Expires=${expiresAtSeconds}&KeyName=${keyName}`
  const signature = createHmac('sha1', rawKey).update(urlToSign).digest()

  return `${urlToSign}&Signature=${encodeBase64Url(signature)}`
}

// storage.rules の currentUserRole()/currentUserGuildId() と同等。
// users/{uid} を優先し、無ければ legacy な user/{uid}(role: '管理者' 判定)にフォールバックする。
const getRequestorProfile = async (
  firestore: Firestore,
  uid: string
): Promise<{ role: string | null; guildId: string | null }> => {
  const userDoc = await firestore.collection('users').doc(uid).get()

  if (userDoc.exists) {
    const data = userDoc.data() ?? {}

    return {
      role: typeof data.role === 'string' ? data.role : null,
      guildId: typeof data.guildId === 'string' ? data.guildId : null
    }
  }

  const legacyUserDoc = await firestore.collection('user').doc(uid).get()

  if (legacyUserDoc.exists) {
    const data = legacyUserDoc.data() ?? {}

    return {
      role: data.role === '管理者' ? 'admin' : 'member',
      guildId: typeof data.guildId === 'string' ? data.guildId : null
    }
  }

  return { role: null, guildId: null }
}

// storage.rules の isGuildMember(guildId) と同等。
const isGuildMember = async (
  firestore: Firestore,
  guildId: string,
  uid: string
): Promise<boolean> => {
  const guildDoc = await firestore.collection('guilds').doc(guildId).get()

  if (!guildDoc.exists) {
    return false
  }

  const guildMember = (guildDoc.data() ?? {}).guildMember

  return Boolean(guildMember && guildMember[uid] != null)
}

// storage.rules の canReadGuildAssets(guildId) と同等。
const canReadGuildAssets = async (
  firestore: Firestore,
  guildId: string,
  requestorUid: string
): Promise<boolean> => {
  const requestor = await getRequestorProfile(firestore, requestorUid)

  if (requestor.role === 'admin') {
    return true
  }

  if (requestor.guildId === guildId) {
    return true
  }

  return isGuildMember(firestore, guildId, requestorUid)
}

// storage.rules の isCurrentUsersGuildMember(uid) と同等。
// 対象ユーザーの guildId は(legacyへのフォールバックをしない) users/{uid} のみを見る点に注意。
const isCurrentUsersGuildMember = async (
  firestore: Firestore,
  targetUserId: string,
  requestorGuildId: string | null
): Promise<boolean> => {
  if (!requestorGuildId) {
    return false
  }

  const targetUserDoc = await firestore
    .collection('users')
    .doc(targetUserId)
    .get()

  if (!targetUserDoc.exists) {
    return false
  }

  return (targetUserDoc.data() ?? {}).guildId === requestorGuildId
}

// storage.rules の canReadPersonalUploads(uid) と同等。
const canReadPersonalUploads = async (
  firestore: Firestore,
  targetUserId: string,
  requestorUid: string
): Promise<boolean> => {
  if (requestorUid === targetUserId) {
    return true
  }

  const requestor = await getRequestorProfile(firestore, requestorUid)

  if (requestor.role === 'admin') {
    return true
  }

  if (requestor.role === 'guild_admin') {
    return isCurrentUsersGuildMember(firestore, targetUserId, requestor.guildId)
  }

  return false
}

export const getPrivateAssetSignedUrl = onCall<
  { path?: unknown },
  Promise<{ url: string; expiresAt: number }>
>(
  {
    region: 'asia-northeast1',
    secrets: [privateTierCdnSigningKey]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication is required.')
    }

    const path = normalizeString(request.data.path)

    if (!path) {
      throw new HttpsError('invalid-argument', 'path is required.')
    }

    const [prefix, ownerId, ...rest] = path.split('/')

    if (
      !ownerId ||
      rest.length === 0 ||
      !(PRIVATE_TIER_PREFIXES as readonly string[]).includes(prefix)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'path must be an object path within a supported private-tier prefix.'
      )
    }

    const firestore = getFirestore()
    const requestorUid = request.auth.uid
    const authorized =
      prefix === PRIVATE_TIER_GUILD_PREFIX
        ? await canReadGuildAssets(firestore, ownerId, requestorUid)
        : await canReadPersonalUploads(firestore, ownerId, requestorUid)

    if (!authorized) {
      throw new HttpsError(
        'permission-denied',
        'You do not have access to this asset.'
      )
    }

    const expiresAt =
      Math.floor(Date.now() / 1000) + PRIVATE_TIER_SIGNED_URL_TTL_SECONDS
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const rawKey = decodeBase64Url(privateTierCdnSigningKey.value())
    const url = signCdnUrl(
      `${PRIVATE_TIER_CDN_ORIGIN}/${encodedPath}`,
      PRIVATE_TIER_SIGNING_KEY_NAME,
      rawKey,
      expiresAt
    )

    return { url, expiresAt }
  }
)

// 出欠確認機能: 作成から30日経過したデータを完全に削除する。
// Firestoreルールでは attendance_events / attendance_responses の delete を
// クライアントから一切禁止しているため、Admin SDK(ルールを経由しない)で実行する。
// このリテンション日数はマイページ側の案内文言(RMAttendanceCreatePage.vue / RMAttendanceManagePage.vue)
// と一致させること。
const ATTENDANCE_RETENTION_DAYS = 30
const FIRESTORE_BATCH_DELETE_LIMIT = 450

export const purgeExpiredAttendanceData = onSchedule(
  {
    region: 'asia-northeast1',
    schedule: '0 4 * * *',
    timeZone: 'Asia/Tokyo'
  },
  async () => {
    const firestore = getFirestore()
    const cutoff = Timestamp.fromMillis(
      Date.now() - ATTENDANCE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    )

    const expiredEventsSnapshot = await firestore
      .collection('attendance_events')
      .where('createdAt', '<', cutoff)
      .get()

    if (expiredEventsSnapshot.empty) {
      return
    }

    let purgedEventCount = 0
    let purgedResponseCount = 0

    for (const eventDoc of expiredEventsSnapshot.docs) {
      try {
        const responsesSnapshot = await firestore
          .collection('attendance_responses')
          .where('eventId', '==', eventDoc.id)
          .get()

        for (
          let offset = 0;
          offset < responsesSnapshot.docs.length;
          offset += FIRESTORE_BATCH_DELETE_LIMIT
        ) {
          const batch = firestore.batch()
          responsesSnapshot.docs
            .slice(offset, offset + FIRESTORE_BATCH_DELETE_LIMIT)
            .forEach((responseDoc) => batch.delete(responseDoc.ref))
          await batch.commit()
        }

        await eventDoc.ref.delete()

        purgedEventCount += 1
        purgedResponseCount += responsesSnapshot.size
      } catch (error) {
        logError('Failed to purge expired attendance event', {
          eventId: eventDoc.id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    logInfo('Purged expired attendance data', {
      purgedEventCount,
      purgedResponseCount
    })
  }
)
