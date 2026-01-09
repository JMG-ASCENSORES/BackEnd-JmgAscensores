# JMG Ascensores - Backend API

Sistema de gestión de mantenimientos de ascensores desarrollado con Node.js, Express y PostgreSQL.

## 🚀 Características Implementadas

### ✅ Autenticación JWT

- Login para Administradores y Técnicos
- Refresh tokens con expiración de 7 días
- Logout con invalidación de sesión
- Protección de rutas con middleware

### ✅ Gestión de Usuarios (Técnicos)

- CRUD completo (solo Admin)
- Filtrado por especialidad
- Ordenamiento por carga de trabajo
- Soft delete para preservar historial
- Validación de DNI y correo únicos

### ✅ Infraestructura

- Middlewares de autenticación y autorización
- Validación de datos con Joi
- Manejo global de errores
- Utilidades para JWT, passwords y códigos únicos
- CORS configurado para Angular

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL 12+
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio**

```bash
cd Back---JMG
```

2. **Instalar dependencias**

```bash
npm install
```

Si hay problemas con npm, instalar manualmente:

```bash
npm install bcryptjs jsonwebtoken joi multer axios pdfkit express-rate-limit
npm install @anthropic-ai/sdk twilio
```

3. **Configurar variables de entorno**

Copiar `.env.example` a `.env` y configurar:

```bash
# Database
DB_NAME=jmg_ascensores
DB_USER=postgres
DB_PASS=tu_password
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura
JWT_REFRESH_SECRET=tu_clave_refresh_muy_segura
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:4200

# Server
PORT=3000
NODE_ENV=development
```

4. **Crear base de datos**

```sql
CREATE DATABASE jmg_ascensores;
```

5. **Iniciar servidor**

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📚 API Endpoints

### Autenticación

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "identificador": "12345678",  // DNI o correo
  "contrasena": "password123"
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": 1,
      "dni": "12345678",
      "nombre": "Juan",
      "apellido": "Pérez",
      "correo": "juan@example.com",
      "rol": "ADMIN",
      "tipo": "administrador"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Usuarios (Técnicos)

**Nota:** Todos los endpoints requieren autenticación. Agregar header:

```
Authorization: Bearer {accessToken}
```

#### Crear Usuario (Admin only)

```http
POST /api/usuarios
Content-Type: application/json
Authorization: Bearer {token}

{
  "dni": "87654321",
  "nombre": "Carlos",
  "apellido": "García",
  "edad": 30,
  "correo": "carlos@example.com",
  "telefono": "987654321",
  "contrasena": "password123",
  "especialidad": "Ascensores",
  "fecha_contrato": "2024-01-15"
}
```

#### Listar Usuarios (Admin only)

```http
GET /api/usuarios
Authorization: Bearer {token}

# Con filtros
GET /api/usuarios?especialidad=Ascensores&estado_activo=true
```

#### Obtener Usuario por ID

```http
GET /api/usuarios/1
Authorization: Bearer {token}
```

#### Actualizar Usuario (Admin only)

```http
PUT /api/usuarios/1
Content-Type: application/json
Authorization: Bearer {token}

{
  "nombre": "Carlos Actualizado",
  "telefono": "999888777"
}
```

#### Eliminar Usuario (Admin only)

```http
DELETE /api/usuarios/1
Authorization: Bearer {token}
```

#### Filtrar por Especialidad (Admin only)

```http
GET /api/usuarios/especialidad/Ascensores
Authorization: Bearer {token}
```

#### Ordenar por Carga de Trabajo (Admin only)

```http
GET /api/usuarios/carga-trabajo
Authorization: Bearer {token}
```

## 🗂️ Estructura del Proyecto

```
Back---JMG/
├── src/
│   ├── config/
│   │   ├── database.js          # Configuración de Sequelize
│   │   └── swagger.js           # Configuración de Swagger
│   ├── controllers/
│   │   ├── auth.controller.js   # Controlador de autenticación
│   │   └── usuarios.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js   # Verificación de JWT
│   │   ├── authorize.middleware.js  # Control de roles
│   │   ├── validate.middleware.js   # Validación con Joi
│   │   └── errorHandler.middleware.js
│   ├── models/
│   │   ├── Administrador.js
│   │   ├── Trabajador.js
│   │   ├── Cliente.js
│   │   ├── Ascensor.js
│   │   ├── Mantenimiento.js
│   │   ├── Sesion.js
│   │   └── ... (14 modelos en total)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── usuarios.routes.js
│   │   └── clienteRoutes.js
│   ├── services/
│   │   ├── auth.service.js      # Lógica de negocio de auth
│   │   └── usuarios.service.js
│   ├── utils/
│   │   ├── jwt.util.js          # Generación y verificación de JWT
│   │   ├── password.util.js     # Hash y comparación de passwords
│   │   ├── response.util.js     # Formateadores de respuesta
│   │   └── codeGenerator.util.js
│   ├── validators/
│   │   ├── auth.validator.js    # Esquemas Joi para auth
│   │   └── usuarios.validator.js
│   ├── seeders/
│   │   └── initialData.js       # Datos iniciales
│   └── app.js                   # Punto de entrada
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Roles y Permisos

### ADMIN (Administrador)

- Acceso completo a todos los endpoints
- Crear, editar y eliminar técnicos
- Gestionar clientes y equipos
- Ver auditoría completa

### TECNICO (Trabajador)

- Ver su propio perfil
- Ver sus trabajos asignados
- Registrar informes de mantenimiento
- Actualizar rutas diarias

## 🛡️ Seguridad

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ JWT con expiración configurable
- ✅ Refresh tokens para renovación segura
- ✅ CORS configurado para Angular
- ✅ Validación de entrada con Joi
- ✅ Protección contra inyección SQL (Sequelize)
- ✅ Manejo seguro de errores

## 📝 Próximos Pasos

- [ ] Implementar CRUD de Clientes
- [ ] Implementar CRUD de Equipos (Ascensores)
- [ ] Implementar gestión de Mantenimientos
- [ ] Implementar sistema de Informes con PDF
- [ ] Integrar Claude AI para sugerencias
- [ ] Integrar Twilio para notificaciones
- [ ] Implementar auditoría automática

## 🐛 Troubleshooting

### Error de conexión a la base de datos

Verificar que PostgreSQL esté corriendo y las credenciales en `.env` sean correctas.

### Error "Token inválido"

El token puede haber expirado. Usar el endpoint `/api/auth/refresh` para renovarlo.

### Error "DNI ya existe"

El DNI debe ser único. Verificar que no exista otro usuario con el mismo DNI.

## 📞 Soporte

Para problemas o consultas, contactar al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2026
