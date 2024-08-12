import { CollectionInstance, DocInstance } from '@magnetarjs/core'
import { Timestamp, DocumentData } from 'firebase/firestore'
import { copy } from 'copy-anything'
import { genFirebaseRandomId } from '@codelic/datagen'

export const formatDataTimestampToDate = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { [key: string]: any },
  docMetadata: DocumentData
) => {
  const _payload = copy(payload)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return p.map((item: any) => convertTimestampToDate(item))
      } else if (typeof p === 'object') {
        return Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries(p).map(([key, value]: any) => [
            key,
            convertTimestampToDate(value)
          ])
        )
      } else {
        return p
      }
    }
    return {
      ...convertTimestampToDate(_payload),
      id: docMetadata.id
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
