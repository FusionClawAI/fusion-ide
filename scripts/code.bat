@echo off
setlocal

title VSCode Dev

pushd %~dp0\..

:: Get electron, compile, built-in extensions
if "%VSCODE_SKIP_PRELAUNCH%"=="" (
	node build/lib/preLaunch.ts || (
		echo Failed to prepare VS Code for launch ^(build/lib/preLaunch.ts^). 1>&2
		goto :failed
	)
)
goto :prelaunch_complete

:failed
popd
endlocal
exit /b 1

:prelaunch_complete

set "NAMESHORT="
for /f "tokens=2 delims=:," %%a in ('findstr /R /C:"\"nameShort\":.*" product.json') do if not defined NAMESHORT set "NAMESHORT=%%~a"
set NAMESHORT=%NAMESHORT: "=%
set NAMESHORT=%NAMESHORT:"=%.exe
set CODE=".build\electron\%NAMESHORT%"

:: Manage built-in extensions
if "%~1"=="--builtin" goto builtin

:: Configuration
set NODE_ENV=development
set VSCODE_DEV=1
set VSCODE_CLI=1
set ELECTRON_ENABLE_LOGGING=1
set ELECTRON_ENABLE_STACK_DUMPING=1

:: --- Start FusionIDE ---
:: build/npm/dirs.ts deliberately skips extensions/copilot's install, so its
:: dist/ is never built and activating it only ever throws. FusionClaw brings
:: its own agent through fusionide-bridge. Kept separate from the test-extension
:: variable, which --extensionTestsPath clears: this one holds either way.
set DISABLE_COPILOT_EXTENSION="--disable-extension=GitHub.copilot-chat"
:: --- End FusionIDE ---
set DISABLE_TEST_EXTENSION="--disable-extension=vscode.vscode-api-tests"
for %%A in (%*) do (
	if "%%~A"=="--extensionTestsPath" (
		set DISABLE_TEST_EXTENSION=""
	)
)

:: Launch Code
%CODE% . %DISABLE_TEST_EXTENSION% %DISABLE_COPILOT_EXTENSION% %*
goto end

:builtin
%CODE% build/builtin

:end

popd

endlocal
