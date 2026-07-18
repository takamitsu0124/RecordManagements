import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

/*
 * Storageの転送量(Egress)コスト対策として、画面外の<img>タグには
 * loading="lazy" を必須とするチェックスクリプト。
 *
 * ESLintのno-restricted-syntaxルールはVue単一ファイルコンポーネントの
 * <template>内AST(VElement等)を走査しないため検出できず、代わりにこの
 * 軽量スクリプトでチェックする。
 *
 * ファーストビューのロゴ等、意図的にlazy loadingを外したい<img>タグは、
 * 直前の行に ALLOW_MARKER のコメントを置くことでチェックを除外できる。
 */

const ALLOW_MARKER = '<!-- img-lazy-loading:allow -->'
const TARGET_DIR = path.resolve(process.cwd(), 'packages/app/src')

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.vue')) {
      files.push(fullPath)
    }
  }

  return files
}

function findViolations(filePath, content) {
  const violations = []
  const lines = content.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('<img')) {
      continue
    }

    // JS/TSコメント内の"<img"という文字列に対する誤検知を避ける
    if (lines[index].trim().startsWith('//')) {
      continue
    }

    // <img>タグが複数行にまたがる場合を考慮し、閉じる ">" まで連結する
    let tagText = lines[index]
    let cursor = index
    while (!tagText.includes('>') && cursor < lines.length - 1) {
      cursor += 1
      tagText += `\n${lines[cursor]}`
    }

    if (/\bloading\s*=/.test(tagText)) {
      continue
    }

    const previousLine = (lines[index - 1] || '').trim()
    if (previousLine === ALLOW_MARKER) {
      continue
    }

    violations.push(`${filePath}:${index + 1}`)
  }

  return violations
}

async function main() {
  const files = await walk(TARGET_DIR)
  const violations = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    violations.push(...findViolations(file, content))
  }

  if (violations.length > 0) {
    console.error('loading="lazy" が指定されていない<img>タグが見つかりました:')
    violations.forEach((violation) => console.error(`  ${violation}`))
    console.error(
      `\nloading="lazy" を追加するか、ファーストビュー要素(ロゴ等)で意図的に除外する場合は` +
        `\n<img>タグの直前の行に ${ALLOW_MARKER} を追加してください。`
    )
    process.exit(1)
  }

  console.log(
    `OK: ${files.length} 件の.vueファイルを確認し、全ての<img>タグに loading="lazy" または明示的な除外指定がありました。`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
