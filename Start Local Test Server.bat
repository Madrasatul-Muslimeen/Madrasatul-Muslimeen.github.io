@echo off
cd /d "%~dp0"
start "" http://localhost:8080/app/admin-self-check.html
node serve.js
pause
