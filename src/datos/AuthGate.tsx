/**
 * Puerta de acceso (Etapa 2): mientras no haya alguien con sesión iniciada,
 * muestra el login en vez de la app. Una vez que inicia sesión, el navegador
 * la recuerda solo — no hay que volver a loguearse en cada visita.
 */

import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { auth } from '../lib/firebase'

const MENSAJE_ERROR: Record<string, string> = {
  'auth/invalid-email': 'Ese mail no es válido.',
  'auth/invalid-credential': 'Mail o contraseña incorrectos.',
  'auth/too-many-requests': 'Muchos intentos. Esperá un minuto y probá de nuevo.',
}

function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    if (entrando) return
    setEntrando(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), clave)
    } catch (err) {
      const codigo = (err as { code?: string }).code ?? ''
      setError(MENSAJE_ERROR[codigo] ?? 'No se pudo iniciar sesión. Probá de nuevo.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div id="app">
      <form
        onSubmit={entrar}
        style={{
          margin: 'auto',
          width: 'min(320px, 90vw)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <h1 style={{ textAlign: 'center' }}>Cóndor Agro</h1>
        <div className="sub" style={{ textAlign: 'center', marginBottom: 10 }}>
          Iniciá sesión con la cuenta de la empresa
        </div>
        <input
          type="email"
          placeholder="Mail"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
        {error && <div className="err">{error}</div>}
        <button className="fab" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  // undefined = todavía no sabemos; null = sin sesión; objeto = con sesión.
  const [conSesion, setConSesion] = useState<boolean | undefined>(undefined)

  useEffect(() => onAuthStateChanged(auth, (u) => setConSesion(!!u)), [])

  if (conSesion === undefined) return null
  if (!conSesion) return <Login />
  return <>{children}</>
}
