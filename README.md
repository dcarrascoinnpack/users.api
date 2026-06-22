# Users API — Faret

API centralizada de autenticación y gestión de usuarios.  
Deployada en IIS bajo `api.faret.cl/users`

---

## Endpoints

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/login | Login, retorna accessToken + refreshToken |
| POST | /auth/refresh | Renueva el accessToken |
| POST | /auth/logout | Cierra sesión |
| GET | /auth/me | Info del usuario actual |

### Usuarios (requiere autenticación)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| GET | /users | Listar usuarios paginados | Admin |
| POST | /users | Crear usuario | Admin |
| GET | /users/:id | Ver usuario | Admin o propio |
| PATCH | /users/:id | Actualizar usuario | Admin o propio |
| DELETE | /users/:id | Desactivar usuario | Admin |
| POST | /users/:id/reactivate | Reactivar usuario | Admin |

---

## Integración desde otros sistemas

### Desde tu API .NET (C#)
```csharp
// Login
var response = await httpClient.PostAsJsonAsync("https://api.faret.cl/users/auth/login", new {
    username = "juanperez",
    password = "password123"
});
var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
// Guarda result.data.accessToken y result.data.refreshToken

// Llamada autenticada
httpClient.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", accessToken);
var me = await httpClient.GetAsync("https://api.faret.cl/users/auth/me");
```

### Desde tu API Node.js
```javascript
// Login
const { data } = await axios.post('https://api.faret.cl/users/auth/login', {
  username: 'juanperez',
  password: 'password123'
})
const { accessToken, refreshToken } = data.data

// Verificar token (sin llamada HTTP, con la misma JWT_SECRET)
import jwt from 'jsonwebtoken'
const payload = jwt.verify(token, process.env.JWT_SECRET)
```

---

## Setup inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar .env y configurar
cp .env.example .env

# 3. Crear base de datos y tablas
npm run migrate

# 4. Compilar
npm run build

# 5. Crear primer admin (ejecutar una vez)
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('CambiarEsto123!', 12);
  await prisma.user.create({
    data: { username: 'admin', email: 'admin@faret.cl', passwordHash: hash, fullName: 'Administrador', role: 'ADMIN' }
  });
  console.log('Admin creado');
}
main().finally(() => prisma.\$disconnect());
"
```

## Deploy en IIS

1. Instalar [iisnode](https://github.com/tjanczuk/iisnode/releases)
2. Copiar carpeta al servidor (sin `node_modules`, sin `.env`)
3. En el servidor: `npm install --production && npm run build`
4. Configurar el `.env` en el servidor
5. En IIS: crear sitio apuntando a la carpeta, con `web.config` presente
6. Agregar binding en `api.faret.cl` para el path `/users`
# users.api
