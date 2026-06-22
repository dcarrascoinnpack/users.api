import { Router } from 'express'
import { z } from 'zod'
import {
  createUser, listUsers, findById, updateUser, deactivateUser, reactivateUser,
} from '../services/user.service'
import { authenticate, requireAdmin } from '../middleware/auth'
import { ok, fail } from '../types'
import { prisma } from '../services/prisma'

const router = Router()

// Todos los endpoints de usuarios requieren estar autenticado
router.use(authenticate)

const createSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9._-]+$/i),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(100),
  role: z.enum(['ADMIN', 'USER']).optional(),
})

const updateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  password: z.string().min(8).optional(),
})

// GET /users — listar usuarios (solo admin)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const result = await listUsers(page, limit)
    res.json(ok(result))
  } catch (err) { next(err) }
})

// POST /users — crear usuario (solo admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body)
    const user = await createUser(body)

    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'CREATE_USER', details: `Usuario creado: ${user.username}`, ip: req.ip },
    })

    res.status(201).json(ok(user, 'Usuario creado correctamente'))
  } catch (err) { next(err) }
})

// GET /users/:id
router.get('/:id', async (req, res, next) => {
  try {
    // Un usuario solo puede ver su propio perfil, admin puede ver cualquiera
    if (req.user!.role !== 'ADMIN' && req.user!.userId !== req.params.id) {
      res.status(403).json(fail('Sin permisos para ver este usuario'))
      return
    }
    const user = await findById(req.params.id)
    if (!user) { res.status(404).json(fail('Usuario no encontrado')); return }
    res.json(ok(user))
  } catch (err) { next(err) }
})

// PATCH /users/:id
router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.userId !== req.params.id) {
      res.status(403).json(fail('Sin permisos para modificar este usuario'))
      return
    }
    // Solo admin puede cambiar roles
    if (req.body.role && req.user!.role !== 'ADMIN') {
      res.status(403).json(fail('Solo un administrador puede cambiar roles'))
      return
    }
    const body = updateSchema.parse(req.body)
    const user = await updateUser(req.params.id, body)

    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'UPDATE_USER', details: `Usuario actualizado: ${user.username}`, ip: req.ip },
    })

    res.json(ok(user, 'Usuario actualizado correctamente'))
  } catch (err) { next(err) }
})

// DELETE /users/:id — desactivar (soft delete, solo admin)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (req.user!.userId === req.params.id) {
      res.status(400).json(fail('No puedes desactivar tu propio usuario'))
      return
    }
    const user = await deactivateUser(req.params.id)

    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'DEACTIVATE_USER', details: `Usuario desactivado: ${user.username}`, ip: req.ip },
    })

    res.json(ok(user, 'Usuario desactivado correctamente'))
  } catch (err) { next(err) }
})

// POST /users/:id/reactivate — reactivar (solo admin)
router.post('/:id/reactivate', requireAdmin, async (req, res, next) => {
  try {
    const user = await reactivateUser(req.params.id)

    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'REACTIVATE_USER', details: `Usuario reactivado: ${user.username}`, ip: req.ip },
    })

    res.json(ok(user, 'Usuario reactivado correctamente'))
  } catch (err) { next(err) }
})

export default router
