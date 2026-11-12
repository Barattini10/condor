/**
 * Conexión a Firebase (Etapa 2: sincronización entre dispositivos).
 *
 * Estos valores no son secretos — son la configuración pública del proyecto
 * de Firebase (`condoragro-bitacora`). La seguridad de verdad la dan las
 * reglas de Firestore (solo usuarios con sesión iniciada) y la contraseña de
 * la cuenta compartida, no el ocultamiento de estos datos.
 */

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCaBCaAsIlDV1zqsGJMoD3_EE5oYcP2z84',
  authDomain: 'condoragro-bitacora.firebaseapp.com',
  projectId: 'condoragro-bitacora',
  storageBucket: 'condoragro-bitacora.firebasestorage.app',
  messagingSenderId: '1023658203574',
  appId: '1:1023658203574:web:e687c03be17c0361f94917',
  measurementId: 'G-FM3EWS7RDX',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Caché local persistente: permite seguir leyendo/escribiendo sin señal (las
// escrituras quedan en cola y se mandan solas cuando vuelve la conexión), y
// soporta tener la app abierta en más de una pestaña a la vez.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
