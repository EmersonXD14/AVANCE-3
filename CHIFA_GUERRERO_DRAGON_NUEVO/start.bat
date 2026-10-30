@echo off
setlocal
cd /d "%~dp0"
echo.
echo  CHIFA EL GUERRERO DRAGON - SISTEMA LOCAL
 echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado.
  echo Instale Node.js 22 LTS o superior y vuelva a ejecutar este archivo.
  pause
  exit /b 1
)
for /f "tokens=1 delims=v" %%v in ('node -v') do set NODE_VERSION=%%v
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22) process.exit(1)" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Se requiere Node.js 22 o superior. Version detectada: %NODE_VERSION%
  pause
  exit /b 1
)
echo Iniciando el servidor local...
echo Cuando aparezca la URL, abra http://127.0.0.1:4173 en su navegador.
echo Para detenerlo, presione Ctrl+C.
echo.
npm start
if errorlevel 1 (
  echo.
  echo El servidor no pudo iniciar. Revise si el puerto 4173 esta ocupado.
  pause
)
endlocal
