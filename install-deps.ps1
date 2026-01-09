# Script de instalación manual de dependencias
# Ejecutar este script si npm install falla

Write-Host "Instalando dependencias de JMG Ascensores Backend..." -ForegroundColor Green

# Dependencias principales
$dependencies = @(
    "bcryptjs@^2.4.3",
    "jsonwebtoken@^9.0.2",
    "joi@^17.11.0",
    "multer@^1.4.5",
    "axios@^1.6.2",
    "pdfkit@^0.13.0",
    "express-rate-limit@^7.1.5"
)

# Dependencias opcionales (para IA y notificaciones)
$optionalDeps = @(
    "@anthropic-ai/sdk@^0.9.1",
    "twilio@^4.19.0"
)

Write-Host "`nInstalando dependencias principales..." -ForegroundColor Yellow
foreach ($dep in $dependencies) {
    Write-Host "Instalando $dep..." -ForegroundColor Cyan
    npm install $dep
}

Write-Host "`n¿Deseas instalar dependencias opcionales (Claude AI y Twilio)? (S/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host "`nInstalando dependencias opcionales..." -ForegroundColor Yellow
    foreach ($dep in $optionalDeps) {
        Write-Host "Instalando $dep..." -ForegroundColor Cyan
        npm install $dep
    }
}

Write-Host "`n✅ Instalación completada!" -ForegroundColor Green
Write-Host "Ejecuta 'npm run dev' para iniciar el servidor" -ForegroundColor Green
