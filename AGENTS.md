# VS Code Agents Instructions

This file provides instructions for AI coding agents working with the VS Code codebase.

For detailed project overview, architecture, coding guidelines, and validation steps, see the [Copilot Instructions](.github/copilot-instructions.md).

FusionIDE uses `main`, `win-release`, `linux-release`, and `mac-release`, with
three native release pipelines. GitHub Actions is reserved for native macOS
release builds; validation, containers, assembly, signing and publication run
in AWS CodeBuild. Do not restore upstream Actions workflows during fork updates.
