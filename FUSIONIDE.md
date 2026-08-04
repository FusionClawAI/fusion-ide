# FusionIDE

FusionIDE is FusionClaw's IDE, built on the open-source
[Code - OSS](https://github.com/microsoft/vscode) core.

FusionIDE is **not** Visual Studio Code, and is not endorsed by or affiliated
with Microsoft. Code - OSS is Copyright (c) Microsoft Corporation and
contributors, used under the MIT License (see `LICENSE.txt`).

## What this repository is

A lightly-patched fork of Code - OSS that builds the **reh-web server target**:
a Node server plus a web workbench. FusionClaw installs the result as a signed
runtime pack and launches it in its own window — the desktop app never bundles
it.

The FusionClaw features inside the workbench (agent bridge, chat, ADE consoles,
status-bar chrome) are **not** in this repository. They live in the FusionClaw
repository under `fusionide/extensions/` and are injected into the pack at
assembly time, so UI work never requires rebuilding this tree.

## Branching

- `fc/main` — integration branch.
- `fc/release/<upstream-minor>` — one branch per adopted upstream stable
  release (currently `fc/release/1.131`).
- Tags: `fusionide-v<upstream>-fc.<n>`, e.g. `fusionide-v1.131.0-fc.1`.

Upstream tracking:

```
git remote add upstream https://github.com/microsoft/vscode.git
git fetch upstream --tags
git merge <upstream tag>
```

Rebase on a **monthly** window; hard ceiling twelve weeks behind upstream;
immediately for a security-tagged upstream release.

**Every source edit is wrapped in markers** so each rebase shows exactly what is
ours:

```ts
// --- Start FusionIDE ---
...
// --- End FusionIDE ---
```

## What we change, and why so little

| Change | Why it cannot be an extension |
| --- | --- |
| `product.json` | Identity, gallery, and the absence of telemetry/update keys are build configuration, not runtime behavior. |
| `patches/terminal-env-allowlist` | No extension API can *remove* unknown variables from a terminal environment — `environmentVariableCollection` only adds or replaces named ones. |
| `patches/fusionide-menus` | Extensions cannot contribute top-level menubar entries; `contributes.menus` has no menubar slots. |
| `patches/webview-media-permissions` | Webview iframes ship a fixed permissions policy with no microphone; there is no API to widen it. |

Everything else — every view, command, and surface — is an extension. Target
steady state is three patches, against VSCodium's ~46.

## Lightweight reh-web build (build-config, no src patches)

To keep the pack small and the build fast, the reh-web target excludes things
FusionClaw does not use. These are **build-config** edits (not source patches),
each marked with `// --- Start FusionIDE --- … // --- End FusionIDE ---` so they
survive an upstream rebase:

- **The built-in GitHub Copilot Chat extension is not built or shipped.**
  FusionClaw injects its own agent via `fusionide-bridge`. Removed from
  `build/gulpfile.reh.ts` (the `compileCopilotExtensionBuildTask` stage, the
  `prepareCopilotRipgrepShimTaskREH` package step, and the reh-web ship-list) and
  from `build/npm/dirs.ts` (skips its ~1.34 GB npm install). The
  `extensions/copilot` source stays in the tree for rebases. The **server-side**
  agent-host Copilot runtime (`@github/copilot*`, `getCopilot*`/`ensureCopilot*`
  in `gulpfile.reh.ts`) is a different artifact and is left intact.
- **Niche language grammars, extra themes, and legacy task-runner extensions are
  pruned.** See `fusionDroppedExtensions` in `build/lib/extensions.ts` (spread
  into `excludedExtensions`, re-used by the reh-web ship-list filter). Common
  languages (python/go/rust/java/cpp/csharp/php/…) stay out-of-box; anything
  dropped is reinstallable from Open VSX. `theme-seti` (default file-icon theme),
  `less`/`scss`, `yaml`, `prompt-basics`, and `github-authentication` are kept.
- **Microsoft telemetry SDKs (`@microsoft/1ds-*`) and the sandbox SDK
  (`@microsoft/mxc-sdk`) are removed from `remote/package.json`** (kept in the
  root `package.json` for compile-time types). They are reached only by
  telemetry-off / gated code paths, so the pack no longer carries them.
- **The reh-web `serverTask` runs the core compile and the extension compile in
  parallel** (`build/gulpfile.reh.ts`), then bundles/minifies after the barrier
  (bundling inlines the builtin-extensions manifest from `.build/extensions`, so
  it cannot overlap the extension compile).

## Policy (binding)

- **Open VSX only.** `extensionsGallery` points at `open-vsx.org`. Never the
  Microsoft marketplace: its Terms of Use restrict it to Microsoft products, and
  Microsoft-proprietary extensions are license-locked to official Visual Studio
  Code regardless.
- **No telemetry.** `product.json` carries no `enableTelemetry`, `aiConfig`,
  `updateUrl`, `experimentsUrl`, or `nlsBaseUrl`. A from-source Code - OSS build
  has no telemetry backend, and none may be added. The FusionClaw shell
  extension additionally defaults `telemetry.telemetryLevel` to `off`.
- **Trademark.** The product name is "FusionIDE". Never use "Visual Studio Code"
  / "VS Code" or the VS Code icon in product UI, packaging, or marketing. The
  only permitted phrasing is factual: "built on the open-source Code - OSS core".
- **Attribution ships with the build.** `LICENSE.txt`, `ThirdPartyNotices.txt`,
  and a generated `notices.json` travel inside every pack; FusionClaw surfaces
  them in Configurations → Notices once a pack is installed.

## Developing (fast loop)

**Do not run the gulp build to test a change.** It is the release path: a full
run is 20+ minutes and every failure surfaces only at the end. Use it once, to
produce a pack.

```
npm run watch          # incremental transpile, seconds per change
scripts\code-server.bat   # runs the server straight from source (no bundling)
```

To check a patch compiles without running anything:

```
npx tsc -p src/tsconfig.json --noEmit
```

## Build (release only)

```
npm ci
npm run gulp -- vscode-reh-web-win32-x64-min      # or linux-x64 / darwin-arm64
```

Use `npm run gulp`, never `npx gulp`: the npm script sets
`--max-old-space-size=8192`, and without it the build dies of heap exhaustion
partway through. Drop `-min` for the fastest runnable server (skips minification
and the non-ASCII guard); never ship an unminified pack.

**The reh-web `serverTask` bundles the core with esbuild (`build/next`), not the
old `tsc` emit** — gated on `useEsbuildTranspile` in `build/buildConfig.ts`
(already `true`, the same flag the desktop `serverTask` and `core-ci` use). This
replaces a ~7-9 min full TypeScript emit with a ~1-3 min esbuild bundle, so a full
`-min` release runs in roughly **~2-3 min** instead of ~9. A `tsgo` type-check
runs in parallel to preserve type-safety (esbuild does not type-check). Set
`useEsbuildTranspile = false` to fall back to the `tsc` + `optimize`/`minify` path.

Accepted esbuild caveats: production source maps are unreliable — debug-only,
since the pack strips all `*.map` and FusionClaw ships no crash-reporting — and
the bundle carries a harmless duplicate `workbench.web.main.internal.js`.

The output must contain the server entry (`out/server-main.js`), a bundled
`node` binary, `extensions/`, and `product.json` — that is exactly what
FusionClaw's `src/main/services/ide-runtime-paths.ts` probes for.

Toolchain: Node from `.nvmrc` (24.18.0, the same pin FusionClaw uses), Python
for `node-gyp`, and a C++ toolchain per platform (Windows: VS 2022 Build Tools
with the Windows SDK and MFC/Spectre; Linux: `build-essential g++ libx11-dev
libxkbfile-dev libsecret-dev libkrb5-dev`; macOS: Xcode CLI tools).

## Pack assembly

Assembly, signing, and publishing live in the FusionClaw repository, which owns
the manifest schema and the trusted keys:

```
npm run fusionide:pack:build -- --server-archive <archive> --upstream-version 1.131.0
npm run fusionide:pack:sign
npm run fusionide:pack:publish
```

The manifest pins both `FUSIONIDE_PACK_VERSION` and `IDE_BRIDGE_VERSION`, so a
pack that speaks the wrong bridge protocol cannot activate. See
`fusionide/FORK-SETUP.md` there for the full contract.
