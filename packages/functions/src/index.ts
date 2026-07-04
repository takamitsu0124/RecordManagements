import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
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
