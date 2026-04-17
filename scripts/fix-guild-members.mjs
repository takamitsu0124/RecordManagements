import admin from 'firebase-admin'

async function main() {
  try {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
    const db = admin.firestore()
    const usersSnap = await db.collection('users').get()
    console.log(`Found ${usersSnap.size} users`)

    const guildUpdates = {}

    for (const doc of usersSnap.docs) {
      const uid = doc.id
      const data = doc.data()
      const guildId = data.guildId || ''
      const role = data.role || 'member'

      // Ensure role and contact.email exist on user doc
      const userUpdate = {}
      if (!data.role) userUpdate.role = role
      if (!data.contact || !data.contact.email) {
        if (data.email) userUpdate.contact = { ...(data.contact || {}), email: data.email }
      }

      if (Object.keys(userUpdate).length > 0) {
        await db.collection('users').doc(uid).set(userUpdate, { merge: true })
        console.log(`Updated user ${uid} fields: ${Object.keys(userUpdate).join(',')}`)
      }

      if (guildId) {
        const name = data.charaName || data.displayName || data.email || ''
        if (!guildUpdates[guildId]) guildUpdates[guildId] = {}
        guildUpdates[guildId][uid] = { name }
      }
    }

    // Apply guild member maps using FieldValue
    for (const [guildId, members] of Object.entries(guildUpdates)) {
      const guildRef = db.collection('guilds').doc(guildId)
      const updateObj = {}
      for (const [uid, val] of Object.entries(members)) {
        updateObj[`guildMember.${uid}`] = val
      }
      await guildRef.set(updateObj, { merge: true })
      console.log(`Updated guild ${guildId} with ${Object.keys(members).length} members`) 
    }

    console.log('Done')
    process.exit(0)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
}

main()
