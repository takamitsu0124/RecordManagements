import { CollectionInstance, DocInstance } from '@magnetarjs/core'
import { Timestamp, DocumentData } from 'firebase/firestore'
import { genFirebaseRandomId } from '@codelic/datagen'

export const formatDataTimestampToDate = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { [key: string]: any },
  docMetadata: DocumentData
) => {
  if (docMetadata.exists) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertTimestampToDate = (p: any): any => {
      if (p instanceof Timestamp) {
        return p.toDate()
      } else if (p instanceof Date) {
        return p
      } else if (p === null) {
        return null
      } else if (Array.isArray(p)) {
        let hasChanged = false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nextArray = p.map((item: any) => {
          const nextItem = convertTimestampToDate(item)
          if (nextItem !== item) {
            hasChanged = true
          }
          return nextItem
        })
        return hasChanged ? nextArray : p
      } else if (typeof p === 'object') {
        let hasChanged = false
        const nextPayload: Record<string, unknown> = {}

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [key, value] of Object.entries(p) as [string, any][]) {
          const nextValue = convertTimestampToDate(value)
          if (nextValue !== value) {
            hasChanged = true
          }
          nextPayload[key] = nextValue
        }

        return hasChanged ? nextPayload : p
      } else {
        return p
      }
    }

    return {
      ...convertTimestampToDate(payload),
      id: docMetadata.id,
    }
  }
  return payload
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeDocWithRandomId<T extends DocumentData>(
  collectionInstance: CollectionInstance<T>,
  data: T
): Promise<DocInstance<T>> {
  return collectionInstance.insert({
    ...data,
    id: genFirebaseRandomId()
  })
}
