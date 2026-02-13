# Guía de Migración de Base de Datos PostgreSQL en Render

Esta guía te ayudará a migrar tu base de datos PostgreSQL de Render antes de que expire el **6 de febrero de 2026**.

![Database Expiration Warning](file:///C:/Users/RODRIGO/.gemini/antigravity/brain/9c73db21-1015-4c17-9a9f-a1adb4ba5fa5/uploaded_media_1770135585915.png)

## 📋 Resumen del Proceso

1. **Crear backup** de la base de datos actual
2. **Crear nueva instancia** de PostgreSQL en Render
3. **Restaurar datos** en la nueva base de datos
4. **Actualizar configuración** de la aplicación
5. **Verificar** que todo funcione correctamente

---

## Método 1: Backup con pg_dump (Recomendado) ⭐

Este método usa las herramientas nativas de PostgreSQL y es el más confiable.

### Requisitos Previos

Necesitas tener instalado PostgreSQL en tu máquina. Verifica con:

```powershell
pg_dump --version
psql --version
```

Si no los tienes, descarga PostgreSQL desde: https://www.postgresql.org/download/windows/

### Paso 1: Crear Backup de la Base de Datos Actual

```powershell
# Navega al directorio del proyecto
cd "C:\Users\RODRIGO\Desktop\JMG ASCENSORES\Back---JMG"

# Crea el directorio de backups si no existe
New-Item -ItemType Directory -Force -Path "backups"

# Crea el backup (reemplaza con tus credenciales actuales)
$env:PGPASSWORD="NAnv4MlyFEZvGWEZW4m8IfZOlhr9vwKF"
pg_dump -h dpg-d5ff9s6r433s73av66m0-a.oregon-postgres.render.com -U jmg_ascensores_user -d jmg_ascensores -F c -b -v -f "backups/jmg_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').dump"
```

> **Nota**: El formato `-F c` (custom) es comprimido y permite restauración selectiva. También puedes usar `-F p` (plain SQL) si prefieres un archivo `.sql` legible.

### Paso 2: Crear Nueva Instancia en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configura la nueva base de datos:
   - **Name**: `jmg-ascensores-new` (o el nombre que prefieras)
   - **Database**: `jmg_ascensores`
   - **User**: Se generará automáticamente
   - **Region**: Elige la misma región (Oregon) para mejor rendimiento
   - **PostgreSQL Version**: 16 (o la versión más reciente)
   - **Plan**: Free (o el plan que necesites)
4. Click en **"Create Database"**
5. Espera a que se cree (toma 1-2 minutos)
6. **Guarda las credenciales** que aparecen:
   - Internal Database URL
   - External Database URL
   - Host
   - Port
   - Database
   - Username
   - Password

### Paso 3: Restaurar Backup en Nueva Base de Datos

```powershell
# Usa las credenciales de la NUEVA base de datos
$env:PGPASSWORD="TU_NUEVA_PASSWORD_AQUI"
pg_restore -h TU_NUEVO_HOST_AQUI -U TU_NUEVO_USER_AQUI -d jmg_ascensores -v "backups/jmg_backup_2026-02-03_XX-XX-XX.dump"
```

### Paso 4: Actualizar Variables de Entorno

Edita el archivo `.env` en tu proyecto:

```env
# Nueva configuración de base de datos
DB_HOST=tu-nuevo-host.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=jmg_ascensores
DB_USER=tu_nuevo_usuario
DB_PASS=tu_nueva_password
DB_SSL=true
DB_DIALECT=postgres
```

### Paso 5: Verificar la Migración

```powershell
# Detén el servidor si está corriendo (Ctrl+C en la terminal de npm run dev)

# Inicia el servidor con la nueva configuración
npm run dev
```

Deberías ver:

```
🔌 Database Config: HOST=tu-nuevo-host, SSL=true
Database connected successfully.
✅ Server is running on port 3000
```

---

## Método 2: Backup con Node.js Scripts

Este método usa scripts personalizados que exportan/importan datos en formato JSON.

### Paso 1: Crear Backup

```powershell
# Asegúrate de que el .env apunta a la base de datos ACTUAL
node src/scripts/backup-database.js
```

Esto creará un directorio en `backups/backup-[timestamp]/` con:

- Un archivo JSON por cada tabla
- Un archivo `metadata.json` con información del backup

### Paso 2: Crear Nueva Instancia en Render

Sigue los mismos pasos del **Método 1 - Paso 2**.

### Paso 3: Actualizar .env con Nueva Base de Datos

Actualiza el `.env` con las credenciales de la nueva base de datos (como en Método 1 - Paso 4).

### Paso 4: Restaurar Backup

```powershell
# Usa la ruta del backup que se creó
node src/scripts/restore-database.js backups/backup-2026-02-03T16-30-00-000Z
```

El script:

1. Creará todas las tablas automáticamente
2. Importará los datos en el orden correcto
3. Mostrará un resumen de registros importados

---

## 🔍 Verificación Post-Migración

### 1. Verificar Tablas y Datos

```powershell
node src/scripts/check-tables.js
```

Esto mostrará todas las tablas y el conteo de registros.

### 2. Probar Login

Usa Postman o tu frontend para probar el login:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@jmg.com",
  "password": "tu_password"
}
```

### 3. Verificar Relaciones

Prueba endpoints que usan relaciones:

```http
# Obtener clientes con sus ascensores
GET http://localhost:3000/api/clientes

# Obtener mantenimientos con información relacionada
GET http://localhost:3000/api/mantenimientos
```

### 4. Checklist de Verificación

- [ ] El servidor se conecta sin errores
- [ ] Todas las 17 tablas existen
- [ ] El conteo de registros coincide con el backup
- [ ] Los usuarios pueden hacer login
- [ ] Las operaciones CRUD funcionan
- [ ] Las relaciones (foreign keys) funcionan correctamente
- [ ] No hay errores en los logs

---

## 🚀 Despliegue en Producción

Una vez verificado localmente:

### 1. Actualizar Variables en Render

1. Ve a tu servicio web en Render
2. Ve a **"Environment"**
3. Actualiza las variables de entorno:
   ```
   DB_HOST=tu-nuevo-host.oregon-postgres.render.com
   DB_USER=tu_nuevo_usuario
   DB_PASS=tu_nueva_password
   DB_NAME=jmg_ascensores
   DB_SSL=true
   ```
4. Guarda los cambios (esto reiniciará el servicio automáticamente)

### 2. Verificar Logs

Revisa los logs del servicio en Render para confirmar que se conectó exitosamente.

---

## ⚠️ Troubleshooting

### Error: "password authentication failed"

- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de copiar la password completa sin espacios

### Error: "SSL connection required"

Asegúrate de tener en `.env`:

```env
DB_SSL=true
```

### Error: "relation does not exist"

Las tablas no se crearon. Si usas el Método 2:

- El script `restore-database.js` debería crearlas automáticamente
- Si no, ejecuta: `node src/scripts/init-db.js`

### Error: "ECONNREFUSED"

- Verifica que el host sea el **External** (no el Internal)
- Verifica que el puerto sea 5432
- Confirma que la base de datos esté activa en Render

### Los conteos de registros no coinciden

1. Revisa el archivo `metadata.json` del backup
2. Compara con los conteos en la nueva base de datos
3. Verifica los logs del restore para ver si hubo errores

---

## 📊 Estructura de la Base de Datos

Tu base de datos contiene **17 tablas**:

1. **Administrador** - Usuarios administradores
2. **Trabajador** - Técnicos/trabajadores
3. **Cliente** - Clientes de JMG
4. **Ascensor** - Ascensores por cliente
5. **Mantenimiento** - Registros de mantenimiento
6. **Tarea** - Tareas de mantenimiento
7. **Asignacion** - Asignaciones de trabajo
8. **Informe** - Informes de trabajo
9. **Evidencia** - Fotos/archivos de evidencia
10. **RutaDiaria** - Rutas diarias de técnicos
11. **DetalleRuta** - Detalles de cada ruta
12. **Notificacion** - Notificaciones del sistema
13. **Auditoria** - Logs de auditoría
14. **Sesion** - Sesiones de usuario
15. **HistorialEstadoMantenimiento** - Historial de cambios
16. **Configuracion** - Configuraciones del sistema
17. **Programacion** - Programación de eventos

---

## 💡 Consejos

1. **Haz el backup AHORA** - No esperes al último día
2. **Prueba localmente primero** - Verifica que la restauración funcione antes de actualizar producción
3. **Guarda las credenciales antiguas** - Por si necesitas volver a hacer el backup
4. **Documenta las credenciales nuevas** - Guárdalas en un lugar seguro
5. **Notifica a tu equipo** - Si hay otros desarrolladores, avísales del cambio

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs del servidor
2. Verifica que las credenciales sean correctas
3. Asegúrate de que la nueva base de datos esté activa en Render
4. Revisa la sección de Troubleshooting arriba

---

## ✅ Siguiente Paso

**¡Empieza creando el backup ahora mismo!**

Elige el método que prefieras:

- **Método 1 (pg_dump)**: Más confiable, requiere PostgreSQL instalado
- **Método 2 (Node.js)**: Más simple, no requiere herramientas adicionales

Una vez tengas el backup seguro, puedes proceder con confianza a crear la nueva base de datos.
