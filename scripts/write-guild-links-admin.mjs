import admin from 'firebase-admin'

const guilds = [
  { id: 'guild-alpha', name: 'Guild Alpha' },
  { id: 'guild-beta', name: 'Guild Beta' }
]

const users = [
  { email: 'testuser1@example.com', role: 'guild_admin', guildId: 'guild-alpha' },
  { email: 'testuser2@example.com', role: 'guild_admin', guildId: 'guild-alpha' },
  { email: 'testuser3@example.com', role: 'guild_admin', guildId: 'guild-beta' },
  { email: 'testuser4@example.com', role: 'member', guildId: 'guild-alpha' },
  { email: 'testuser5@example.com', role: 'member', guildId: 'guild-beta' },
  { email: 'testuser6@example.com', role: 'member', guildId: 'guild-beta' }
]

const password = 'kagura1130'

async function main() {
  try {
    // Use Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
    const db = admin.firestore()
    const auth = admin.auth()

    console.log('Writing guild documents...')
    for (const g of guilds) {
      await db.collection('guilds').doc(g.id).set({
        id: g.id,
        name: g.name,
        createdBy: 'script',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      console.log(`Guild written: ${g.id}`)
    }

    const results = []
    for (const u of users) {
      try {
        let userRecord
        try {
          userRecord = await auth.getUserByEmail(u.email)
          console.log(`User exists: ${u.email} (uid=${userRecord.uid})`)
        } catch (e) {
          if (e.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ email: u.email, password })
            console.log(`Created Auth user ${u.email} (uid=${userRecord.uid})`)
          } else {
            throw e
          }
        }

        const uid = userRecord.uid
        await db.collection('users').doc(uid).set({
          email: u.email,
          guildId: u.guildId,
          role: u.role,
          updatedBy: 'script',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        console.log(`Linked ${u.email} -> ${u.guildId} as ${u.role}`)
        results.push({ email: u.email, uid, ok: true })
      } catch (err) {
        console.error(`Failed for ${u.email}:`, err.message || err)
        results.push({ email: u.email, ok: false, error: err.message || err })
      }
    }

    console.log('Done. Results:', results)
    process.exit(0)
  } catch (e) {
    console.error('Fatal error:', e.message || e)
    process.exit(1)
  }
}

main()
