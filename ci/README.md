# FusionIDE automation

`main` is development. Runtime packs have three AWS release pipelines:

| Branch | Pipeline | Native host |
| --- | --- | --- |
| `win-release` | `fusionide-win-prod` | Windows CodeBuild |
| `linux-release` | `fusionide-linux-prod` | Linux CodeBuild |
| `mac-release` | `fusionide-mac-prod` | GitHub macOS, dispatched by CodeBuild |

Infrastructure and pack tooling live in
`FusionClawAI/fusionclaw/cloud/fusionclaw-fusionide-pipeline`, sourced from
`main`. Only the fork's matching release branch triggers each pipeline.
Assembly, signing and publication run in CodeBuild for every platform.

PR/main validation runs through the native CodeBuild webhook project
`fusionclaw-ci-fusion-ide-prod`, using `ci/buildspec-validation.yml`. It has no
signing or publishing credentials. Supported checks cover client/API/Monaco
types, build tooling and Node/browser unit tests.

The old `release-fusionide-pack.yml` duplicated the AWS pipeline and failed
checking out private tooling. It and the inherited upstream Actions workflows
are removed. Upstream Microsoft runner pools, Copilot performance/setup,
telemetry, MSRC policies and Azure screenshot services are not deployed for
FusionIDE. Consult Git history for those upstream definitions.

GitHub Actions may only contain native macOS release workflows. Do not import
upstream workflows when updating the fork. `macos-fusionide-pack.yml` builds
the native Darwin server and uploads it to private S3 staging. It has no
permission to publish or read the pack signing key.
