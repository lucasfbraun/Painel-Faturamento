@echo off
REM ---------------------------------------------------------------------------
REM  Painel de Faturamento - execucao direta com Node.js (sem Docker)
REM  Requer Node 20 ou superior: https://nodejs.org (versao LTS)
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

REM o pacote ja vem com dist/ compilado; so builda se estiver faltando
if not exist "dist\src\main.js" (
  echo Compilando pela primeira vez ^(precisa de internet^)...
  call npm install --no-audit --no-fund || goto :falhabuild
  call npm run build || goto :falhabuild
)

echo.
echo  Painel de Faturamento
echo  ERP.......: %ERP_BASE_URL%   ^(empresa %ERP_EMPRESA%^)
echo  Janela....: %DIAS_RETROATIVOS% dias   Ciclo: %POLL_INTERVALO_MIN% min
echo  Abra......: http://localhost:%PORT%
echo  Encerrar..: Ctrl+C
echo.

node dist\src\main.js
pause
exit /b 0

:semtoken
echo.
echo [ERRO] ERP_TOKEN nao esta preenchido no arquivo .env.
echo        Cole o token JWT do ERP na linha ERP_TOKEN= (o mesmo valor do curl,
echo        sem "Bearer"). Sem isso o ERP responde HTTP 401.
echo.
notepad .env
echo Salve o .env e rode este arquivo novamente.
pause
exit /b 1

:falhabuild
echo.
echo [ERRO] Falha ao compilar. Verifique o acesso ao registry do npm.
pause
exit /b 1
