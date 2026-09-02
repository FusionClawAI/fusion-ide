/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FusionClaw. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Rewrite product.json into FusionIDE's identity, deterministically.
 *
 * Run after every upstream rebase (`node build/fusionide/apply-product-overlay.mjs`).
 * Upstream keeps adding product configuration — 1.131 introduced an in-tree
 * Copilot integration, a Microsoft voice WebSocket, and a telemetry app name —
 * so a hand-edited product.json silently reacquires whatever the next merge
 * brings. This script is the single definition of what FusionIDE ships, and
 * `--check` fails the build if anything forbidden came back.
 *
 * It is a MERGE, not a replacement: upstream owns structural keys the build
 * reads (win32 identifiers, artifact feeds, extension policy), and dropping
 * them breaks packaging in ways that surface late.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRODUCT = join(ROOT, 'product.json');

/**
 * Keys FusionIDE must never ship.
 *
 * - Copilot: `trustedExtensionAuthAccess` grants Copilot Chat silent GitHub auth — a
 *   Microsoft product integration, not Code - OSS. `defaultChatAgent` is NOT stripped: the
 *   agent-enabled workbench reads it at startup and crashes to a blank screen when it is
 *   absent, so IDENTITY ships a SANITIZED one (FusionClaw's own fusionide-bridge ids, every
 *   GitHub entitlement/token/documentation URL blanked to an empty string).
 * - Telemetry and remote services: no ingestion key, no update server, no
 *   experiment or NLS service, and no Microsoft voice endpoint.
 * The built-in extension lists are handled separately, in IDENTITY: they are
 * set to empty arrays rather than deleted. The entries are fetched from whatever
 * gallery product.json configures (build/lib/builtInExtensions.ts), so with an
 * Open VSX gallery the build would ask Open VSX for Microsoft-published
 * extensions. Upstream also iterates builtInExtensionsEnabledWithAutoUpdates
 * without a fallback at runtime, so both keys must remain present. Empty ships
 * nothing and enables no automatic updates.
 */
const FORBIDDEN_KEYS = [
	'aiConfig',
	'enableTelemetry',
	'agentsTelemetryAppName',
	'updateUrl',
	'downloadUrl',
	'experimentsUrl',
	'nlsBaseUrl',
	'cacheUrl',
	'trustedExtensionAuthAccess',
	'voiceWsUrl',
	'sessionsWindowAllowedExtensions',
	'onboardingKeymaps',
	'onboardingThemes',
	'tunnelApplicationName',
	'webviewContentExternalBaseUrlTemplate',
];

/** Any gallery host that is not Open VSX is a Terms-of-Use violation for a fork. */
const FORBIDDEN_SUBSTRINGS = ['marketplace.visualstudio.com', 'vscode-unpkg.net', 'vscode-cdn.net'];

const IDENTITY = {
	// Empty, not absent: gulpfile.reh.ts reads this key without a fallback.
	builtInExtensions: [],
	// Empty, not absent: extension scanning iterates this key without a fallback.
	builtInExtensionsEnabledWithAutoUpdates: [],
	nameShort: 'FusionIDE',
	nameLong: 'FusionIDE by FusionClaw',
	applicationName: 'fusionide',
	dataFolderName: '.fusionide',
	serverApplicationName: 'fusionide-server',
	serverDataFolderName: '.fusionide-server',
	urlProtocol: 'fusionide',
	quality: 'stable',
	licenseName: 'MIT',
	licenseUrl: 'https://github.com/FusionClawAI/fusion-ide/blob/fc/main/LICENSE.txt',
	serverLicenseUrl: 'https://github.com/FusionClawAI/fusion-ide/blob/fc/main/LICENSE.txt',
	reportIssueUrl: 'https://github.com/FusionClawAI/fusion-ide/issues/new',
	requestFeatureUrl: 'https://github.com/FusionClawAI/fusion-ide/issues/new',
	documentationUrl: 'https://fusionclaw.ai/docs',
	win32DirName: 'FusionIDE',
	win32NameVersion: 'FusionIDE',
	win32RegValueName: 'FusionIDE',
	win32AppUserModelId: 'FusionClaw.FusionIDE',
	win32ShellNameShort: 'FusionIDE',
	darwinBundleIdentifier: 'ai.fusionclaw.fusionide',
	linuxIconName: 'fusionide',
	// The server accepts its own terms silently; there is no Microsoft licence
	// prompt to answer because this is not a Microsoft product.
	serverGreeting: [],
	serverLicense: [],
	serverLicensePrompt: '',
	extensionsGallery: {
		serviceUrl: 'https://open-vsx.org/vscode/gallery',
		itemUrl: 'https://open-vsx.org/vscode/item',
		latestUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest',
		controlUrl:
			'https://raw.githubusercontent.com/EclipseFdn/publish-extensions/master/extension-control/extensions.json',
	},
	linkProtectionTrustedDomains: [
		'https://open-vsx.org',
		'https://fusionclaw.ai',
		'https://github.com/FusionClawAI',
	],
	// FusionClaw ships its own agent via the injected fusionide-bridge extension. The
	// agent-enabled workbench reads product.defaultChatAgent.extensionId/.chatExtensionId at
	// startup (and crashes to a blank screen if the object is absent), so provide the
	// STRUCTURAL config it needs — SANITIZED: ids point at fusionide-bridge and every GitHub
	// entitlement/token/documentation URL is an empty string, so no Microsoft/GitHub endpoint ships.
	defaultChatAgent: {
		extensionId: 'fusionclaw.fusionide-bridge',
		chatExtensionId: 'fusionclaw.fusionide-bridge',
		chatExtensionOutputId: 'fusionclaw.fusionide-bridge',
		chatExtensionOutputExtensionStateCommand: '',
		documentationUrl: '',
		skusDocumentationUrl: '',
		optimizeUsageDocumentationUrl: '',
		publicCodeMatchesUrl: '',
		managePlanUrl: '',
		upgradePlanUrl: '',
		signUpUrl: '',
		termsStatementUrl: '',
		privacyStatementUrl: '',
		provider: {
			default: { id: 'fusionclaw', name: 'FusionClaw' },
			enterprise: { id: 'fusionclaw', name: 'FusionClaw' },
			google: { id: 'fusionclaw', name: 'FusionClaw' },
			apple: { id: 'fusionclaw', name: 'FusionClaw' },
		},
		providerExtensionId: 'fusionclaw.fusionide-bridge',
		providerUriSetting: '',
		providerScopes: [],
		entitlementUrl: '',
		entitlementSignupLimitedUrl: '',
		tokenEntitlementUrl: '',
		mcpRegistryDataUrl: '',
		managedSettingsUrl: '',
		chatQuotaExceededContext: '',
		completionsQuotaExceededContext: '',
		walkthroughCommand: '',
		completionsMenuCommand: '',
		chatRefreshTokenCommand: '',
		generateCommitMessageCommand: '',
		resolveMergeConflictsCommand: '',
		completionsAdvancedSetting: '',
		completionsEnablementSetting: '',
		nextEditSuggestionsSetting: '',
	},
};

function violations(product) {
	const found = [];
	for (const key of FORBIDDEN_KEYS) {
		if (key in product) {
			found.push(`forbidden key present: ${key}`);
		}
	}
	const serialized = JSON.stringify(product);
	for (const needle of FORBIDDEN_SUBSTRINGS) {
		if (serialized.includes(needle)) {
			found.push(`forbidden endpoint present: ${needle}`);
		}
	}
	const gallery = product.extensionsGallery?.serviceUrl ?? '';
	if (!gallery.startsWith('https://open-vsx.org/')) {
		found.push(`extension gallery is not Open VSX: ${gallery || '(unset)'}`);
	}
	if (product.nameShort !== IDENTITY.nameShort) {
		found.push(`nameShort is ${product.nameShort}, expected ${IDENTITY.nameShort}`);
	}
	return found;
}

const product = JSON.parse(readFileSync(PRODUCT, 'utf8'));

if (process.argv.includes('--check')) {
	const found = violations(product);
	if (found.length > 0) {
		console.error(`product.json violates FusionIDE policy:\n- ${found.join('\n- ')}`);
		process.exit(1);
	}
	console.log('product.json satisfies FusionIDE policy');
	process.exit(0);
}

for (const key of FORBIDDEN_KEYS) {
	delete product[key];
}
Object.assign(product, IDENTITY);

const found = violations(product);
if (found.length > 0) {
	console.error(`overlay did not produce a compliant product.json:\n- ${found.join('\n- ')}`);
	process.exit(1);
}

writeFileSync(PRODUCT, `${JSON.stringify(product, null, '\t')}\n`);
console.log(`product.json rewritten for ${IDENTITY.nameLong}`);
