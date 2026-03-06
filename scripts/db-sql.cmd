@echo off
REM Supabase SQL Runner for Windows
REM Usage: scripts\db-sql.cmd <sql-file.sql>

if "%~1"=="" (
    echo Usage: scripts\db-sql.cmd ^<sql-file.sql^>
    exit /b 1
)

if not exist .env (
    echo Error: .env file not found
    exit /b 1
)

REM Extract SUPABASE_URL from .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="SUPABASE_URL" set "SUPABASE_URL=%%b"
)

for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="SUPABASE_SERVICE_ROLE_KEY" set "SUPABASE_SERVICE_ROLE_KEY=%%b"
)

echo Connecting to: %SUPABASE_URL%
echo Executing: %~1

REM Use psql or supabase CLI if available
supabase db execute --file "%~1" 2>nul
if errorlevel 1 (
    echo Trying direct psql connection...
    psql "%SUPABASE_URL%" -f "%~1"
)
