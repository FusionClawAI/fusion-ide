/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { $, append, ModifierKeyEmitter } from '../../../../../base/browser/dom.js';
import { timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IMenuService, MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { MenuService } from '../../../../../platform/actions/common/menuService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { FusionideMenubarToggle } from '../../../../browser/parts/titlebar/fusionideMenubarToggle.js';
import { CustomMenubarControl } from '../../../../browser/parts/titlebar/menubarControl.js';
import { LayoutSettings, shouldShowCustomTitleBar } from '../../../../services/layout/browser/layoutService.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { workbenchInstantiationService } from '../../workbenchTestServices.js';

suite('FusionIDE retractable menu header', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	async function createHeader(store: Pick<DisposableStore, 'add'> = disposables) {
		const instantiationService = workbenchInstantiationService(undefined, store);
		const configuration = new TestConfigurationService({ window: { menuBarVisibility: 'hidden' } });
		instantiationService.stub(IConfigurationService, configuration);
		instantiationService.stub(IContextKeyService, store.add(new ContextKeyService(configuration)));
		instantiationService.stub(IUpdateService, new class extends mock<IUpdateService>() {
			override readonly onStateChange = Event.None;
			override readonly state = State.Uninitialized;
		});
		instantiationService.stub(IPreferencesService, new class extends mock<IPreferencesService>() { });
		const executed: string[] = [];
		instantiationService.stub(ICommandService, new class extends mock<ICommandService>() {
			override async executeCommand<T>(id: string): Promise<T | undefined> {
				executed.push(id);
				return undefined;
			}
		});
		instantiationService.stub(IMenuService, store.add(instantiationService.createInstance(MenuService)));
		const fileMenu = MenuId.for('FusionideTestFileMenu');
		store.add(MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
			submenu: fileMenu, title: { value: 'File', original: 'File', mnemonicTitle: '&&File' }, order: 0,
		}));
		store.add(MenuRegistry.appendMenuItem(fileMenu, {
			command: { id: 'test.fusionide.autoSave', title: 'Auto Save', toggled: ContextKeyExpr.true() },
		}));
		const container = append(document.body, $('.monaco-workbench'));
		container.style.width = '600px';
		const menuElement = append(container, $('.menubar'));
		menuElement.style.width = '560px';
		menuElement.style.height = '28px';
		const control = store.add(instantiationService.createInstance(CustomMenubarControl));
		const toggles = store.add(new DisposableStore());
		const mountToggle = () => toggles.add(instantiationService.createInstance(FusionideMenubarToggle, container, control, menuElement, () => { }));
		const toggle = mountToggle();
		control.create(menuElement);
		store.add(toDisposable(() => {
			container.remove();
			ModifierKeyEmitter.disposeInstance();
		}));
		const button = () => container.querySelector<HTMLButtonElement>('.fusionide-menubar-toggle')!;
		// Finish the native control's asynchronous accessibility initialization.
		await timeout(0);
		return { toggle, control, menuElement, container, button, toggles, mountToggle, configuration, executed };
	}

	suiteSetup(async () => {
		// Native menus lazily register a global Focus Application Menu action.
		// Initialize that application-lifetime registration before tracking instances.
		const warmup = new DisposableStore();
		await createHeader(warmup);
		warmup.dispose();
	});

	test('opens by default, collapses to a keyboard-accessible chevron, and restores the preference', async () => {
		const header = await createHeader();
		assert.strictEqual(header.toggle.expanded, true);
		assert.notStrictEqual(header.menuElement.style.display, 'none');
		assert.strictEqual(header.button().getAttribute('aria-controls'), header.menuElement.id);
		header.button().click();
		assert.strictEqual(header.menuElement.style.display, 'none');
		assert.strictEqual(header.button().getAttribute('aria-expanded'), 'false');
		assert.strictEqual(header.button().tabIndex, 0);
		assert.strictEqual(header.toggle.height, 20);
		header.toggles.clear();
		const restored = header.mountToggle();
		assert.strictEqual(restored.expanded, false);
		header.button().click();
		assert.strictEqual(restored.expanded, true);
		assert.strictEqual(restored.height, 28);
		assert.strictEqual(header.menuElement.style.display, 'flex');
		assert.strictEqual(header.configuration.getValue('window.menuBarVisibility'), 'hidden');
	});

	test('keyboard menu focus temporarily expands a collapsed header without changing its saved preference', async () => {
		const header = await createHeader();
		header.button().click();
		header.control.toggleFocus();
		assert.strictEqual(header.toggle.expanded, true);
		assert.strictEqual(header.menuElement.style.display, 'flex');
		header.control.toggleFocus();
		assert.strictEqual(header.toggle.expanded, false);
		header.toggles.clear();
		assert.strictEqual(header.mountToggle().expanded, false);
	});

	test('preserves native checked menu actions and command dispatch after reopening', async () => {
		const header = await createHeader();
		header.button().click();
		header.button().click();
		await timeout(0);
		const file = header.menuElement.querySelector<HTMLElement>('[aria-label="File"]');
		assert.ok(file);
		file.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
		const autoSave = header.container.querySelector<HTMLElement>('[role="menuitemcheckbox"]');
		assert.ok(autoSave);
		assert.strictEqual(autoSave.getAttribute('aria-checked'), 'true');
		// Native menus arm mouse-up after 100 ms to ignore the click that opened them.
		await timeout(110);
		autoSave.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
		await timeout(0);
		assert.deepStrictEqual(header.executed, ['test.fusionide.autoSave']);
	});

	test('keeps the disclosure header in the grid even when other titlebar content is hidden', () => {
		const configuration = new TestConfigurationService({
			window: { commandCenter: false, menuBarVisibility: 'hidden' },
			workbench: { activityBar: { location: 'hidden' }, layoutControl: { enabled: false }, editor: { editorActionsLocation: 'default', showTabs: 'multiple' } },
			fusionclaw: { window: { retractableMenuBar: true } },
		});
		assert.strictEqual(configuration.getValue(LayoutSettings.FUSIONIDE_RETRACTABLE_MENU_BAR), true);
		assert.strictEqual(shouldShowCustomTitleBar(configuration, window, false), true);
	});
});
