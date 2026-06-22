import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../services/auth.service'
import { fail } from '../types'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; username: string; role: string }
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json(fail('Token requerido'))
    return
  }
  try {
    const payload = verifyAccessToken(header.slice(7))
    req.user = { userId: payload.userId, username: payload.username, role: payload.role }
    next()
  } catch {
    res.status(401).json(fail('Token inválido o expirado'))
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json(fail('Se requieren permisos de administrador'))
    return
  }
  next()
}

// Para comunicación entre servicios internos (tu API .NET o Node pueden llamar con API Key)
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key']
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json(fail('API Key inválida'))
    return
  }
  next()
}
