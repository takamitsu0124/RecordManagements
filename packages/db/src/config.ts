import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, initializeAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
import { genFirebaseRandomId } from '@codelic/datagen'
import { CreatePlugin as PluginFirestore } from '@magnetarjs/plugin-firestore'
import { CreatePlugin as PluginVue3 } from '@magnetarjs/plugin-vue3'
import { Magnetar } from '@magnetarjs/core'
import { logger } from '@magnetarjs/utils'

// ===============================
// 0. Initialize firebase
// ===============================
export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyAbP781Dp0Nw-AStVWf2cTnrOcrOQO3H7U',
  authDomain: 'recordmanagements-756bf.firebaseapp.com',
  projectId: 'recordmanagements-756bf',
  storageBucket: 'recordmanagements-756bf.appspot.com',
  messagingSenderId: '330209751384',
  appId: '1:330209751384:web:a944d02b0e5adfa8a5352d',
  measurementId: 'G-Z6LZKFB4BN'
})

export const db = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)
export const storage = getStorage(firebaseApp)
export const cf = getFunctions(firebaseApp, 'asia-northeast1')

// 1. the plugin firestore for remote data store
//    create the remote store plugin instance & pass your db:
// ---------------------------------------------
const remote = PluginFirestore({ db, syncDebounceMs: 10 })

// ---------------------------------------
// 2. the plugin vue3 for local data store
//    create the local store plugin instance & pass your generateRandomId:
// ---------------------------------------
const local = PluginVue3({ generateRandomId: genFirebaseRandomId })

export const magnetar = Magnetar({
  stores: { cache: local, local, remote },
  localStoreName: 'local',
  executionOrder: {
    read: ['local', 'remote'],
    write: ['local', 'remote'],
    delete: ['local', 'remote']
  },

  on: process.env.NODE_ENV === 'production' ? {} : { success: logger } // disable this on production builds
})
