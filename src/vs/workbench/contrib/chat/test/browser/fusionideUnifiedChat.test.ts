/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { Extensions, IViewsRegistry } from '../../../../common/views.js';
import { ChatEntitlementContext, ChatEntitlementContextKeys } from '../../../../services/chat/common/chatEntitlementService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { registerChatActions } from '../../browser/actions/chatActions.js';
import { ChatViewId } from '../../browser/chat.js';
import '../../browser/chatParticipant.contribution.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import '../../../../browser/actions/helpActions.js';

// These commands are workbench contributions with a process-wide lifetime.
if (!CommandsRegistry.getCommand('workbench.action.chat.open')) {
	registerChatActions();
}

suite('FusionIDE unified chat', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	test('Help and the command palette do not offer the retired Ask @vscode action', () => {
		for (const menu of [MenuId.MenubarHelpMenu, MenuId.CommandPalette]) {
			assert.strictEqual(MenuRegistry.getMenuItems(menu).some(item => 'command' in item && item.command.id === 'workbench.action.askVScode'), false);
		}
		assert.strictEqual(CommandsRegistry.getCommand('workbench.action.askVScode'), undefined);
	});

	test('a registered participant cannot restore the native chat in an embedded window', () => {
		const context = new MockContextKeyService();
		context.createKey('config.fusionclaw.chat.unifiedPanel', true);
		ChatContextKeys.panelParticipantRegistered.bindTo(context).set(true);
		ChatContextKeys.Setup.hidden.bindTo(context).set(false);
		const view = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry).getView(ChatViewId);
		assert.ok(view?.when);
		assert.strictEqual(view.when.evaluate({ getValue: key => context.getContextKeyValue(key) }), false);
		context.createKey('config.fusionclaw.chat.unifiedPanel', false);
		assert.strictEqual(view.when.evaluate({ getValue: key => context.getContextKeyValue(key) }), true);
	});

	test('the embedded layout keeps setup hidden across extension activation and old settings', async () => {
		const configuration = new TestConfigurationService({ 'fusionclaw.chat.unifiedPanel': true, 'chat.disableAIFeatures': false });
		disposables.add(configuration.onDidChangeConfigurationEmitter);
		const keys = new MockContextKeyService();
		const context = disposables.add(new ChatEntitlementContext(keys, disposables.add(new TestStorageService()),
			new NullLogService(), configuration, NullTelemetryService));
		await context.update({ installed: true, disabled: false, untrusted: false, disabledInWorkspace: false });
		assert.strictEqual(keys.getContextKeyValue(ChatEntitlementContextKeys.Setup.hidden.key), true);
		await configuration.setUserConfiguration('fusionclaw.chat.unifiedPanel', false);
		configuration.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: key => key === 'fusionclaw.chat.unifiedPanel',
			affectedKeys: new Set(['fusionclaw.chat.unifiedPanel']), change: { keys: ['fusionclaw.chat.unifiedPanel'], overrides: [] }, source: ConfigurationTarget.USER });
		await Promise.resolve();
		assert.strictEqual(keys.getContextKeyValue(ChatEntitlementContextKeys.Setup.hidden.key), false);
	});

	test('native open and toggle commands focus the desktop chat without creating a widget', async () => {
		const calls: string[] = [];
		const configuration = new TestConfigurationService({ 'fusionclaw.chat.unifiedPanel': true });
		disposables.add(configuration.onDidChangeConfigurationEmitter);
		const services = disposables.add(new TestInstantiationService());
		services.stub(IConfigurationService, configuration);
		services.stub(ICommandService, new class extends mock<ICommandService>() {
			override async executeCommand<T>(command: string): Promise<T> { calls.push(command); return undefined as T; }
		}());
		for (const id of ['workbench.action.chat.open', 'workbench.action.chat.toggle']) {
			const command = CommandsRegistry.getCommand(id);
			assert.ok(command);
			await services.invokeFunction(accessor => command.handler(accessor));
		}
		assert.deepStrictEqual(calls, ['fusionclaw.chat.focus', 'fusionclaw.chat.focus']);
	});
});
