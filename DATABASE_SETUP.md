# ✅ Conexión a Base de Datos Render Configurada

## Credenciales Configuradas

```env
DB_HOST=dpg-d5ff9s6r433s73av66m0-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=jmg_ascensores
DB_USER=jmg_ascensores_user
DB_PASS=NAnv4MlyFEZvGWEZW4m8IfZOlhr9vwKF
```

## Estado

✅ Archivo `.env` actualizado  
✅ Nodemon reiniciará el servidor automáticamente  
✅ Conexión a PostgreSQL en Render

## Verificación

Cuando el servidor se conecte exitosamente verás:

```
Database connected successfully.
✅ Server is running on port 3000
```

## URLs de Conexión

**Internal (dentro de Render):**

```
postgresql://jmg_ascensores_user:NAnv4MlyFEZvGWEZW4m8IfZOlhr9vwKF@dpg-d5ff9s6r433s73av66m0-a/jmg_ascensores
```

**External (desde tu máquina):**

```
postgresql://jmg_ascensores_user:NAnv4MlyFEZvGWEZW4m8IfZOlhr9vwKF@dpg-d5ff9s6r433s73av66m0-a.oregon-postgres.render.com/jmg_ascensores
```

## Próximos Pasos

Una vez conectado, el servidor:

1. Sincronizará los modelos con la BD (creará las tablas)
2. Ejecutará el seeder para datos iniciales
3. Estará listo para recibir peticiones

## Probar la Conexión

```bash
# Endpoint raíz
GET http://localhost:3000/

# Login
POST http://localhost:3000/api/auth/login
```
