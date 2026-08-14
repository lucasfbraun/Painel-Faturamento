@echo off
REM ---------------------------------------------------------------------------
REM  Painel de Faturamento - execucao direta com Node.js (sem Docker)
REM  Requer Node 18 ou superior: https://nodejs.org  (versao LTS)
REM  Le as variaveis do arquivo .env que esta nesta mesma pasta.
REM ---------------------------------------------------------------------------
setlocal enabledelayedexpansion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado no PATH.
  echo        Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [AVISO] .env criado a partir do .env.example.
  ) else (
    echo [ERRO] Arquivo .env nao encontrado.
    pause
    exit /b 1
  )
)

REM carrega o .env, ignorando comentarios e linhas sem "="
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%~a"=="" if not "%%~b"=="" set "%%~a=%%~b"
)

if "%PORT%"=="" set "PORT=2000"

if "%ERP_TOKEN%"=="" goto :semtoken
echo %ERP_TOKEN% | find "COLE_SEU_TOKEN_AQUI" >nul && goto :semtoken

echo.
echo  Painel de Faturamento
echo  ERP.......: %ERP_BASE_URL%   (empresa %ERP_EMPRESA%)
echo  Janela....: %DIAS_RETROATIVOS% dias   Ciclo: %POLL_INTERVALO_MIN% min
echo  Abra......: http://localhost:%PORT%
echo  Encerrar..: Ctrl+C
echo.

node server.js
pause
exit /b 0

:semtoken
echo.
echo [ERRO] ERP_TOKEN nao esta preenchido no arquivo .env.
echo        Abra o .env nesta pasta e cole o token JWT do ERP na linha ERP_TOKEN=
echo        (o mesmo valor que voce usa no header Authorization do curl, sem "Bearer").
echo        Sem isso o ERP responde HTTP 401.
echo.
notepad .env
echo Salve o .env e rode este arquivo novamente.
pause
exit /b 1
