export interface JwtPayload {
  userId: string
  username: string
  role: string
  iat?: number
  exp?: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message }
}

export function fail(message: string, errors?: string[]): ApiResponse {
  return { success: false, message, errors }
}
