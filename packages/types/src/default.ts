export type DefaultType = {
  id: string
  createdBy: string | number
  updatedBy: string | number
  createdAt: Date
  updatedAt: Date
  noEditLog?: boolean
}

export function defaultType(): DefaultType {
  return {
    id: '',
    createdBy: '',
    updatedBy: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
