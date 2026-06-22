import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from './prisma'
import type { JwtPayload } from '../types'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

export async function rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const existing = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  })

  if (!existing || existing.expiresAt < new Date() || !existing.user.isActive) return null

  await prisma.refreshToken.delete({ where: { id: existing.id } })

  const user = existing.user
  const accessToken = generateAccessToken({ userId: user.id, username: user.username, role: user.role })
  const refreshToken = await generateRefreshToken(user.id)

  return { accessToken, refreshToken }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } })
}
