import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { fail } from '../types'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json(fail('Ya existe un usuario con ese email o nombre de usuario'))
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json(fail('Usuario no encontrado'))
      return
    }
  }

  if (err instanceof Error) {
    res.status(500).json(fail(
      process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
    ))
    return
  }

  res.status(500).json(fail('Error interno del servidor'))
}
