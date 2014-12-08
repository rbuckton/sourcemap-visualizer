@echo off
SETLOCAL
SET PATHEXT=%PATHEXT:;.JS;=;%
node  "%~dp0\cli.js" %*