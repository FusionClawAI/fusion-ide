/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FusionClaw. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// --- Start FusionIDE ---

import { localize } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';

/**
 * Menubar entries for the FusionClaw commands.
 *
 * These live in core because extensions cannot reach the menubar:
 * `contributes.menus` exposes context menus, editor titles, and view titles,
 * but has no slot for the File or Help menus and no way to declare a new
 * top-level submenu. The commands themselves are registered by the
 * `fusionclaw.fusionide-bridge` extension; this file only says where they
 * appear, so a menu change never requires rebuilding the workbench.
 *
 * Command ids are intentionally referenced as string literals: core must not
 * import from an extension, and a missing command simply renders a disabled
 * entry rather than breaking the menu.
 */

const FUSIONCLAW_TOOLS_MENU = new MenuId('FusionclawToolsMenu');

MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
	group: '1_new',
	command: {
		id: 'fusionclaw.backToStart',
		title: localize({ key: 'miFusionclawNewProject', comment: ['&& denotes a mnemonic'] }, "New &&Project...")
	},
	order: 5
});

MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
	group: '6_close',
	command: {
		id: 'fusionclaw.signOut',
		title: localize({ key: 'miFusionclawSignOut', comment: ['&& denotes a mnemonic'] }, "Sign &&Out")
	},
	order: 10
});

MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
	group: '1_welcome',
	command: {
		id: 'fusionclaw.openConfigurations',
		title: localize({ key: 'miFusionclawConfigurations', comment: ['&& denotes a mnemonic'] }, "FusionClaw &&Configurations")
	},
	order: 5
});

MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
	group: '4_update',
	command: {
		id: 'fusionclaw.checkForUpdates',
		title: localize({ key: 'miFusionclawCheckForUpdates', comment: ['&& denotes a mnemonic'] }, "Check for &&Updates...")
	},
	order: 1
});

/**
 * The Tools menu is a top-level submenu, which no extension point can create.
 * Its entries are the tool surfaces the desktop owns; each command is a single
 * hand-off over the loopback bridge.
 */
/**
 * Gated on the bridge extension having activated. Without it a failed
 * activation would leave a Tools menu whose every entry throws "command not
 * found"; with it the menu is simply absent.
 */
const FUSIONCLAW_BRIDGE_READY = ContextKeyExpr.has('fusionclaw.bridgeReady');

MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
	submenu: FUSIONCLAW_TOOLS_MENU,
	title: localize({ key: 'miFusionclawTools', comment: ['&& denotes a mnemonic'] }, "&&Tools"),
	when: FUSIONCLAW_BRIDGE_READY,
	order: 6
});

/**
 * The registered tool surfaces, mirroring the desktop's `IDE_MENU_TOOL_IDS` and
 * its four groups. Each id is `fusionclaw.tools.<toolId>`, using the desktop's
 * own tool id verbatim so a typo here resolves to nothing rather than to the
 * wrong tool; the handlers live in the bridge extension, which opens a native
 * FusionClaw tool window parented to this IDE.
 */
const TOOL_ENTRIES: ReadonlyArray<{ id: string; title: string; group: string; order: number }> = [
	// Create & automate
	{ id: 'fusionclaw.tools.skill-forge', title: localize('miFusionclawSkillManager', "Skill Manager"), group: '1_create', order: 1 },
	{ id: 'fusionclaw.tools.frontend-studio', title: localize('miFusionclawFrontendTools', "Frontend Tools"), group: '1_create', order: 2 },
	{ id: 'fusionclaw.tools.fusion-prototyper', title: localize('miFusionclawPrototyper', "Fusion Prototyper"), group: '1_create', order: 3 },
	{ id: 'fusionclaw.tools.loop-engineering', title: localize('miFusionclawLoopEngineering', "Loop Engineering"), group: '1_create', order: 4 },
	{ id: 'fusionclaw.tools.download-manager', title: localize('miFusionclawDownloadManager', "Download Manager"), group: '1_create', order: 5 },
	{ id: 'fusionclaw.tools.ssh-connections', title: localize('miFusionclawSshConnections', "SSH Connections"), group: '1_create', order: 6 },
	// Workspace intelligence
	{ id: 'fusionclaw.tools.session-history', title: localize('miFusionclawSessionHistory', "Session History"), group: '2_workspace', order: 1 },
	{ id: 'fusionclaw.tools.account-limits', title: localize('miFusionclawAccountLimits', "Account Limits"), group: '2_workspace', order: 2 },
	{ id: 'fusionclaw.tools.graphify', title: localize('miFusionclawGraphify', "Graphify"), group: '2_workspace', order: 3 },
	{ id: 'fusionclaw.tools.git-tree', title: localize('miFusionclawGitTree', "GitTree"), group: '2_workspace', order: 4 },
	{ id: 'fusionclaw.tools.multi-monitor', title: localize('miFusionclawMultiMonitor', "Multi-Monitor Support"), group: '2_workspace', order: 5 },
	// Observe
	{ id: 'fusionclaw.tools.system-performance', title: localize('miFusionclawSystemPerformance', "System Performance"), group: '3_observe', order: 1 },
	{ id: 'fusionclaw.tools.token-performance', title: localize('miFusionclawTokenPerformance', "Token Performance"), group: '3_observe', order: 2 },
	// Security
	{ id: 'fusionclaw.tools.secrets-manager', title: localize('miFusionclawSecretsManager', "Secrets Manager"), group: '4_security', order: 1 },
	// The FusionClaw surfaces that are not registry tools.
	{ id: 'fusionclaw.chat.focus', title: localize('miFusionclawChat', "FusionClaw Chat"), group: '5_surfaces', order: 1 },
	{ id: 'fusionclaw.openInTerminal', title: localize('miFusionclawTerminal', "Open in FusionClaw Terminal"), group: '5_surfaces', order: 2 },
	{ id: 'fusionclaw.openAgenticDevelopmentEnvironment', title: localize('miFusionclawAde', "Agentic Development Environment"), group: '5_surfaces', order: 3 },
	{ id: 'fusionclaw.wiring.open', title: localize('miFusionclawWiring', "Connect to an ADE Workspace"), group: '5_surfaces', order: 4 },
	{ id: 'fusionclaw.openBilling', title: localize('miFusionclawBilling', "Credits and Billing"), group: '6_account', order: 1 },
];

for (const entry of TOOL_ENTRIES) {
	MenuRegistry.appendMenuItem(FUSIONCLAW_TOOLS_MENU, {
		group: entry.group,
		command: { id: entry.id, title: entry.title },
		when: FUSIONCLAW_BRIDGE_READY,
		order: entry.order
	});
}

// --- End FusionIDE ---
