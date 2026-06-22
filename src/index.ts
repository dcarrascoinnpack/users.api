import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import { errorHandler } from './middleware/errorHandler'
import { ok } from './types'

const app = express()
const PORT = process.env.PORT || 4000

// Seguridad básica
app.use(helmet())
app.use(express.json({ limit: '10kb' }))

// Rate limiting — evita fuerza bruta
app.use('/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { success: false, message: 'Demasiados intentos, espera 15 minutos' },
}))

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
}))

// Rutas
app.use('/auth', authRoutes)
app.use('/users', userRoutes)

// Health check — IIS lo puede usar para monitoreo
app.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok', timestamp: new Date().toISOString() }))
})

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

// Error handler global
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Users API corriendo en puerto ${PORT}`)
})

export default app
