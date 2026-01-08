# Backend JMG Ascensores API

API REST para el sistema de gestión de JMG Ascensores, desarrollada con Node.js, Express y PostgreSQL.

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **PostgreSQL** - Base de datos relacional
- **Sequelize** - ORM para PostgreSQL
- **Swagger** - Documentación de API
- **CORS** - Manejo de peticiones cross-origin

## 📋 Requisitos Previos

- Node.js 14+
- PostgreSQL 12+
- npm o yarn

## 🔧 Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU-USUARIO/Back---JMG.git
cd Back---JMG
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
DB_NAME=jmg_ascensores
DB_USER=tu_usuario
DB_PASS=tu_contraseña
DB_HOST=localhost
DB_DIALECT=postgres
DB_PORT=5432
PORT=3000
NODE_ENV=development
```

### 4. Crear la base de datos

```bash
# Accede a PostgreSQL
psql -U postgres

# Crea la base de datos
CREATE DATABASE jmg_ascensores;

# Sal de PostgreSQL
\q
```

### 5. Iniciar el servidor

**Modo desarrollo (con auto-reload):**

```bash
npm run dev
```

**Modo producción:**

```bash
npm start
```

El servidor estará corriendo en `http://localhost:3000`

## 📚 Documentación de la API

Una vez que el servidor esté corriendo, accede a la documentación interactiva de Swagger:

```
http://localhost:3000/api-docs
```

## 🌐 Endpoints Principales

### Raíz

```
GET /
```

Retorna un mensaje de bienvenida.

### Clientes

```
GET    /api/clientes       - Obtener todos los clientes
GET    /api/clientes/:id   - Obtener un cliente por ID
POST   /api/clientes       - Crear un nuevo cliente
PUT    /api/clientes/:id   - Actualizar un cliente
DELETE /api/clientes/:id   - Eliminar un cliente
```

## 🚀 Despliegue en Producción

Para desplegar esta API en Render (o cualquier otro servicio), consulta la guía detallada:

📖 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía completa de despliegue en Render

## 📁 Estructura del Proyecto

```
Back---JMG/
├── src/
│   ├── config/
│   │   ├── database.js      # Configuración de Sequelize
│   │   └── swagger.js       # Configuración de Swagger
│   ├── controllers/
│   │   └── clienteController.js
│   ├── models/
│   │   └── Cliente.js
│   ├── routes/
│   │   └── clienteRoutes.js
│   ├── seeders/
│   │   └── initialData.js   # Datos iniciales
│   └── app.js               # Punto de entrada
├── .env.example             # Ejemplo de variables de entorno
├── .gitignore
├── package.json
├── render.yaml              # Configuración para Render
├── DEPLOYMENT.md            # Guía de despliegue
└── README.md
```

## 🤝 Contribuir

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Haz push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 👥 Equipo

Este proyecto está siendo desarrollado por múltiples colaboradores para JMG Ascensores.

## 📝 Licencia

ISC

## 📞 Soporte

Para preguntas o problemas, por favor abre un issue en el repositorio de GitHub.

---

**Desarrollado con ❤️ para JMG Ascensores**
