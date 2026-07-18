export type CsvRecord = Record<string, string> & {
  __rowNumber: number
}

export function normalizeCsvWhitespace(value: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- CSVの生セル値(文字列/数値想定)を意図的に文字列化する汎用ヘルパー
  return String(value ?? '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function readTextFile(file: File) {
  return await file.text()
}

export function parseCsv(content: string): CsvRecord[] {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1
      }

      row.push(current)
      current = ''

      if (row.some((cell) => normalizeCsvWhitespace(cell) !== '')) {
        rows.push(row)
      }

      row = []
      continue
    }

    current += char
  }

  if (current !== '' || row.length > 0) {
    row.push(current)
    if (row.some((cell) => normalizeCsvWhitespace(cell) !== '')) {
      rows.push(row)
    }
  }

  if (rows.length === 0) {
    return []
  }

  const headers = rows[0].map((cell) => normalizeCsvWhitespace(cell))

  return rows.slice(1).map((cells, rowIndex) => {
    const record = {
      __rowNumber: rowIndex + 2
    } as CsvRecord

    headers.forEach((header, index) => {
      record[header] = cells[index] ?? ''
    })

    return record
  })
}
