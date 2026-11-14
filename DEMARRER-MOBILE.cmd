@echo off
cd /d "%~dp0mobile"
call npm.cmd run start:tunnel -- --clear
pause
