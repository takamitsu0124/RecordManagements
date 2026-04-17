import admin from 'firebase-admin'
import fs from 'fs'

const outPath = './scripts/users-export.csv'

async function main() {
  admin.initializeApp({ credential: admin.credential.applicationDefault() })
  const db = admin.firestore()

  const snap = await db.collection('users').get()
  const rows = []
  rows.push(['uid','email','role','guildId','charaName','createdAt'].join(','))

  snap.forEach(doc => {
    const d = doc.data()
    const uid = doc.id
    const email = (d.contact && d.contact.email) || d.email || ''
    const role = d.role || ''
    const guildId = d.guildId || ''
    const charaName = (d.charaName || d.displayName || '')
    const createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || '')

    // escape quotes
    const escape = (s) => `"${String(s).replace(/"/g,'""')}"`
    rows.push([escape(uid), escape(email), escape(role), escape(guildId), escape(charaName), escape(createdAt)].join(','))
  })

  fs.writeFileSync(outPath, rows.join('\n'))
  console.log('Wrote CSV to', outPath)
}

main().catch(e => { console.error(e); process.exit(1) })
