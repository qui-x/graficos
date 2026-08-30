@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  echo Abrindo Calculadora Grafica em http://localhost:8000/
  start "" http://localhost:8000/
  py -m http.server 8000
  goto :eof
)
where python >nul 2>&1
if %errorlevel%==0 (
  echo Abrindo Calculadora Grafica em http://localhost:8000/
  start "" http://localhost:8000/
  python -m http.server 8000
  goto :eof
)
echo Python nao foi encontrado.
echo Instale Python 3 ou abra a pasta usando outro servidor HTTP local.
pause
