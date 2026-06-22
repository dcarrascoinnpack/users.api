import { prisma } from './prisma'
import { hashPassword } from './auth.service'
import type { Role } from '@prisma/client'

export interface CreateUserDto {
  username: string
  email: string
  password: string
  fullName: string
  role?: Role
}

export interface UpdateUserDto {
  email?: string
  fullName?: string
  role?: Role
  password?: string
}

const safeUser = (u: { id: string; username: string; email: string; fullName: string; role: Role; isActive: boolean; createdAt: Date; updatedAt: Date }) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
})

export async function createUser(dto: CreateUserDto) {
  const passwordHash = await hashPassword(dto.password)
  const user = await prisma.user.create({
    data: {
      username: dto.username.toLowerCase().trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      fullName: dto.fullName.trim(),
      role: dto.role ?? 'USER',
    },
  })
  return safeUser(user)
}

export async function findByUsername(username: string) {
  return prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } })
}

export async function findById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  return user ? safeUser(user) : null
}

export async function listUsers(page = 1, limit = 50) {
  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
  ])
  return { users: users.map(safeUser), total, page, limit, pages: Math.ceil(total / limit) }
}

export async function updateUser(id: string, dto: UpdateUserDto) {
  const data: Record<string, unknown> = {}
  if (dto.email) data.email = dto.email.toLowerCase().trim()
  if (dto.fullName) data.fullName = dto.fullName.trim()
  if (dto.role) data.role = dto.role
  if (dto.password) data.passwordHash = await hashPassword(dto.password)

  const user = await prisma.user.update({ where: { id }, data })
  return safeUser(user)
}

export async function deactivateUser(id: string) {
  await prisma.refreshToken.deleteMany({ where: { userId: id } })
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  })
  return safeUser(user)
}

export async function reactivateUser(id: string) {
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true, deletedAt: null },
  })
  return safeUser(user)
}
