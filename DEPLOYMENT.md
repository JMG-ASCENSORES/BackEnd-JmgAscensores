# Guía de Despliegue en Render - Backend JMG Ascensores

Esta guía te llevará paso a paso para desplegar tu backend en Render con despliegue continuo desde GitHub.

## 📋 Requisitos Previos

- [ ] Cuenta en [GitHub](https://github.com)
- [ ] Código del backend subido a un repositorio de GitHub
- [ ] Cuenta en [Render](https://render.com) (gratuita)

## 🚀 Paso 1: Preparar el Repositorio en GitHub

### 1.1 Si aún no has subido tu código a GitHub:

```bash
# En la carpeta de tu proyecto
cd "c:\Users\RODRIGO\Desktop\JMG ASCENSORES\Back---JMG"

# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Backend JMG Ascensores"

# Crear repositorio en GitHub y conectarlo
# Ve a github.com y crea un nuevo repositorio llamado "Back---JMG"
# Luego ejecuta:
git remote add origin https://github.com/TU-USUARIO/Back---JMG.git
git branch -M main
git push -u origin main
```

### 1.2 Verificar que los archivos estén en GitHub

Asegúrate de que estos archivos estén en tu repositorio:

- ✅ `package.json`
- ✅ `src/app.js`
- ✅ `.env.example` (sin valores sensibles)
- ✅ `.gitignore` (debe incluir `.env`)
- ✅ `render.yaml` (opcional pero recomendado)

## 🗄️ Paso 2: Crear Base de Datos PostgreSQL en Render

### 2.1 Acceder a Render Dashboard

1. Ve a [https://render.com](https://render.com)
2. Inicia sesión o crea una cuenta (puedes usar tu cuenta de GitHub)
3. En el Dashboard, haz clic en **"New +"** → **"PostgreSQL"**

### 2.2 Configurar la Base de Datos

Completa el formulario con la siguiente información:

| Campo                  | Valor                                    |
| ---------------------- | ---------------------------------------- |
| **Name**               | `jmg-ascensores-db`                      |
| **Database**           | `jmg_ascensores`                         |
| **User**               | `jmg_user` (se genera automáticamente)   |
| **Region**             | `Oregon (US West)` o el más cercano a ti |
| **PostgreSQL Version** | `16` (la más reciente)                   |
| **Plan**               | `Free`                                   |

3. Haz clic en **"Create Database"**
4. **IMPORTANTE**: Guarda las credenciales que aparecen. Las necesitarás en el siguiente paso:
   - Internal Database URL
   - External Database URL
   - PSQL Command
   - Host
   - Port
   - Database
   - Username
   - Password

> [!WARNING]
> La base de datos gratuita de Render expira después de 90 días. Recibirás un correo antes de que expire para que puedas renovarla gratuitamente.

## 🌐 Paso 3: Crear Web Service (Backend API)

### 3.1 Crear Nuevo Web Service

1. En el Dashboard de Render, haz clic en **"New +"** → **"Web Service"**
2. Selecciona **"Build and deploy from a Git repository"**
3. Haz clic en **"Connect GitHub"** (si es la primera vez)
4. Busca y selecciona tu repositorio **"Back---JMG"**
5. Haz clic en **"Connect"**

### 3.2 Configurar el Web Service

Completa el formulario con la siguiente información:

| Campo              | Valor                                |
| ------------------ | ------------------------------------ |
| **Name**           | `jmg-ascensores-api`                 |
| **Region**         | `Oregon (US West)` (mismo que la BD) |
| **Branch**         | `main`                               |
| **Root Directory** | (dejar vacío)                        |
| **Runtime**        | `Node`                               |
| **Build Command**  | `npm install`                        |
| **Start Command**  | `npm start`                          |
| **Plan**           | `Free`                               |

### 3.3 Configurar Variables de Entorno

En la sección **"Environment Variables"**, agrega las siguientes variables usando los valores de tu base de datos PostgreSQL creada en el Paso 2:

| Key          | Value            | Notas                                                          |
| ------------ | ---------------- | -------------------------------------------------------------- |
| `NODE_ENV`   | `production`     | Ambiente de producción                                         |
| `DB_NAME`    | `jmg_ascensores` | De la BD creada                                                |
| `DB_USER`    | `jmg_user`       | De la BD creada                                                |
| `DB_PASS`    | `[password]`     | De la BD creada (copia el password)                            |
| `DB_HOST`    | `[host]`         | De la BD creada (ej: `dpg-xxxxx-a.oregon-postgres.render.com`) |
| `DB_DIALECT` | `postgres`       | Tipo de base de datos                                          |
| `DB_PORT`    | `5432`           | Puerto por defecto de PostgreSQL                               |

> [!TIP]
> Puedes copiar los valores directamente desde la página de detalles de tu base de datos PostgreSQL en Render.

### 3.4 Configurar Auto-Deploy

En la sección **"Auto-Deploy"**, asegúrate de que esté activado:

- ✅ **"Auto-Deploy"** → `Yes`

Esto hará que cada vez que hagas `git push` a la rama `main`, Render automáticamente redespliegue tu aplicación.

### 3.5 Crear el Web Service

Haz clic en **"Create Web Service"**

Render comenzará a:

1. Clonar tu repositorio
2. Instalar dependencias (`npm install`)
3. Iniciar el servidor (`npm start`)

Este proceso puede tomar 2-5 minutos.

## ✅ Paso 4: Verificar el Despliegue

### 4.1 Verificar que el Servicio Esté Activo

1. Una vez completado el despliegue, verás un estado **"Live"** en verde
2. Render te proporcionará una URL pública, algo como:
   ```
   https://jmg-ascensores-api.onrender.com
   ```

### 4.2 Probar la API

Abre tu navegador y prueba los siguientes endpoints:

**Endpoint raíz:**

```
https://jmg-ascensores-api.onrender.com/
```

Deberías ver:

```json
{ "message": "Welcome to JMG Ascensores API" }
```

**Documentación Swagger:**

```
https://jmg-ascensores-api.onrender.com/api-docs
```

Deberías ver la interfaz de Swagger con la documentación de tu API.

**Endpoint de clientes:**

```
https://jmg-ascensores-api.onrender.com/api/clientes
```

### 4.3 Revisar Logs

Si algo no funciona:

1. En el Dashboard de Render, ve a tu Web Service
2. Haz clic en la pestaña **"Logs"**
3. Revisa los mensajes de error

## 🔄 Paso 5: Configurar Despliegue Continuo

El despliegue continuo ya está configurado. Ahora cada vez que:

1. Hagas cambios en tu código local
2. Hagas commit: `git commit -m "Descripción del cambio"`
3. Hagas push: `git push origin main`

Render automáticamente:

- Detectará el cambio
- Clonará el nuevo código
- Reinstalará dependencias si es necesario
- Reiniciará el servidor
- Actualizará la aplicación en vivo

### Verificar el Auto-Deploy

Prueba haciendo un pequeño cambio:

1. Edita `src/app.js` y cambia el mensaje de bienvenida:

```javascript
app.get("/", (req, res) => {
  res.json({ message: "Welcome to JMG Ascensores API - Updated!" });
});
```

2. Haz commit y push:

```bash
git add .
git commit -m "Update welcome message"
git push origin main
```

3. Ve al Dashboard de Render y observa cómo se despliega automáticamente
4. Verifica el cambio en tu URL de producción

## 👥 Paso 6: Colaboración en Equipo

Para que varias personas trabajen en el proyecto:

### 6.1 Agregar Colaboradores en GitHub

1. Ve a tu repositorio en GitHub
2. Settings → Collaborators → Add people
3. Agrega a tus compañeros de equipo por su usuario de GitHub

### 6.2 Agregar Colaboradores en Render (Opcional)

1. En el Dashboard de Render, ve a tu Web Service
2. Settings → Team Members
3. Invita a tus compañeros por email

### 6.3 Flujo de Trabajo Recomendado

Para evitar conflictos cuando varias personas trabajan:

1. **Usar ramas (branches):**

```bash
# Crear una nueva rama para tu feature
git checkout -b feature/nueva-funcionalidad

# Hacer cambios y commit
git add .
git commit -m "Agregar nueva funcionalidad"

# Subir la rama
git push origin feature/nueva-funcionalidad
```

2. **Crear Pull Request en GitHub:**

   - Ve a GitHub
   - Crea un Pull Request de tu rama a `main`
   - Pide a un compañero que revise
   - Una vez aprobado, haz merge

3. **Actualizar tu código local:**

```bash
# Cambiar a main
git checkout main

# Obtener últimos cambios
git pull origin main
```

## 🔧 Troubleshooting

### Problema: "Application failed to respond"

**Solución:**

- Verifica que el comando de inicio sea `npm start`
- Revisa los logs en Render para ver errores específicos
- Asegúrate de que el puerto use `process.env.PORT`

### Problema: "Unable to connect to database"

**Solución:**

- Verifica que todas las variables de entorno estén configuradas correctamente
- Asegúrate de que la base de datos esté en estado "Available"
- Verifica que el `DB_HOST` sea el correcto (Internal o External según tu configuración)

### Problema: "Build failed"

**Solución:**

- Revisa que `package.json` tenga todas las dependencias necesarias
- Verifica que no haya errores de sintaxis en tu código
- Revisa los logs de build en Render

### Problema: El servicio se duerme (Free Plan)

**Comportamiento esperado:**

- Los servicios gratuitos de Render se "duermen" después de 15 minutos de inactividad
- La primera petición después de dormir puede tardar 30-60 segundos en responder
- Las peticiones subsecuentes serán rápidas

**Soluciones:**

- Upgrade a un plan de pago ($7/mes) para mantenerlo siempre activo
- Usar un servicio de "ping" como [UptimeRobot](https://uptimerobot.com) para mantenerlo despierto (hace peticiones cada 5 minutos)

### Problema: "Module not found"

**Solución:**

- Asegúrate de que todas las dependencias estén en `package.json` bajo `dependencies` (no `devDependencies`)
- Ejecuta `npm install` localmente para verificar
- Haz commit y push de `package.json` actualizado

## 📚 Recursos Adicionales

- [Documentación oficial de Render](https://render.com/docs)
- [Render Status](https://status.render.com) - Estado de los servicios
- [Render Community](https://community.render.com) - Foro de la comunidad
- [Documentación de PostgreSQL en Render](https://render.com/docs/databases)

## 🎉 ¡Listo!

Tu backend ahora está desplegado en Render con:

- ✅ URL pública accesible desde cualquier lugar
- ✅ Base de datos PostgreSQL
- ✅ Despliegue continuo automático
- ✅ Listo para trabajo en equipo

**URL de tu API:** `https://jmg-ascensores-api.onrender.com`

**Próximos pasos recomendados:**

1. Configurar un dominio personalizado (opcional)
2. Agregar tests automatizados
3. Configurar monitoreo y alertas
4. Implementar CI/CD más avanzado con GitHub Actions
