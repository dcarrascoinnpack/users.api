import { Router } from 'express'
import { z } from 'zod'
import { findByUsername } from '../services/user.service'
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/auth.service'
import { authenticate } from '../middleware/auth'
import { ok, fail } from '../types'
import { prisma } from '../services/prisma'

const router = Router()

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const user = await findByUsername(body.username)

    if (!user || !user.isActive) {
      res.status(401).json(fail('Credenciales inválidas'))
      return
    }

    const valid = await verifyPassword(body.password, user.passwordHash)
    if (!valid) {
      res.status(401).json(fail('Credenciales inválidas'))
      return
    }

    const accessToken = generateAccessToken({ userId: user.id, username: user.username, role: user.role })
    const refreshToken = await generateRefreshToken(user.id)

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', ip: req.ip },
    })

    res.json(ok({ accessToken, refreshToken, user: {
      id: user.id, username: user.username, fullName: user.fullName, role: user.role,
    }}))
  } catch (err) {
    next(err)
  }
})

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) { res.status(400).json(fail('Refresh token requerido')); return }

    const tokens = await rotateRefreshToken(refreshToken)
    if (!tokens) { res.status(401).json(fail('Refresh token inválido o expirado')); return }

    res.json(ok(tokens))
  } catch (err) {
    next(err)
  }
})

// POST /auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) await revokeRefreshToken(refreshToken)
    res.json(ok(null, 'Sesión cerrada correctamente'))
  } catch (err) {
    next(err)
  }
})

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json(ok(req.user))
})

export default router
