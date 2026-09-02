/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FusionClaw. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// --- Start FusionIDE ---

import * as dom from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { IDisposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { MenuItemAction } from '../../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../../platform/actionWidget/browser/actionWidget.js';
import { IActionWidgetDropdownAction, IActionWidgetDropdownOptions } from '../../../../../../platform/actionWidget/browser/actionWidgetDropdown.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { ChatInputPickerActionViewItem, IChatInputPickerOptions } from './chatInputPickerActionItem.js';

/**
 * FusionClaw's execution-mode chip, beside the model and agent pickers.
 *
 * The mode is the broker's, not the workbench's: `auto` runs commands
 * immediately, `ask` stops before each change, `plan` drafts without running,
 * `plan-review` adds a reviewer. It is the same setting `/auto`, `/ask`,
 * `/plan` and `/review` drive, so the two can never disagree.
 *
 * All of the copy — labels and hints — is published by the
 * `fusionclaw.fusionide-bridge` extension rather than written here, so this
 * widget owns no strings that could drift from the desktop's own picker. Core
 * cannot import from an extension, and context keys are the channel the
 * extension host already has: `fusionclaw.chat.actionModeMenu` carries the JSON
 * the dropdown renders. A key that is absent or unparseable simply yields no
 * items, and `FusionclawActionModeContext` hides the chip entirely.
 */

export const FUSIONCLAW_ACTION_MODE_KEY = 'fusionclaw.chat.actionMode';
export const FUSIONCLAW_ACTION_MODE_MENU_KEY = 'fusionclaw.chat.actionModeMenu';
export const FUSIONCLAW_SET_ACTION_MODE_COMMAND = 'fusionclaw.chat.setActionMode';

interface FusionclawActionModeEntry {
	readonly id: string;
	readonly label: string;
	readonly hint?: string;
}

interface FusionclawActionModeMenu {
	readonly current: string;
	readonly modes: readonly FusionclawActionModeEntry[];
}

function isEntry(value: unknown): value is FusionclawActionModeEntry {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const entry = value as Partial<FusionclawActionModeEntry>;
	return typeof entry.id === 'string' && entry.id.length > 0
		&& typeof entry.label === 'string' && entry.label.length > 0
		&& (entry.hint === undefined || typeof entry.hint === 'string');
}

/**
 * The published menu, or `undefined`. Parsed defensively: this string crosses
 * the extension-host boundary, so a shape we do not recognise must render
 * nothing rather than a half-built menu.
 */
export function parseActionModeMenu(raw: unknown): FusionclawActionModeMenu | undefined {
	if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096) {
		return undefined;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return undefined;
	}
	if (!parsed || typeof parsed !== 'object') {
		return undefined;
	}
	const menu = parsed as Partial<FusionclawActionModeMenu>;
	if (typeof menu.current !== 'string' || !Array.isArray(menu.modes)) {
		return undefined;
	}
	const modes = menu.modes.filter(isEntry);
	return modes.length > 0 ? { current: menu.current, modes } : undefined;
}

export class FusionclawActionModePickerActionItem extends ChatInputPickerActionViewItem {

	/** The base takes the service but does not expose it; the label needs it. */
	private readonly keys: IContextKeyService;

	constructor(
		action: MenuItemAction,
		pickerOptions: IChatInputPickerOptions,
		@IActionWidgetService actionWidgetService: IActionWidgetService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		const readMenu = (): FusionclawActionModeMenu | undefined =>
			parseActionModeMenu(contextKeyService.getContextKeyValue(FUSIONCLAW_ACTION_MODE_MENU_KEY));

		const options: Omit<IActionWidgetDropdownOptions, 'label' | 'labelRenderer'> = {
			actionProvider: {
				getActions: (): IActionWidgetDropdownAction[] => {
					const menu = readMenu();
					if (!menu) {
						return [];
					}
					return menu.modes.map((mode): IActionWidgetDropdownAction => ({
						id: mode.id,
						label: mode.label,
						description: mode.hint,
						tooltip: mode.hint ?? mode.label,
						class: undefined,
						enabled: true,
						checked: mode.id === menu.current,
						run: () => this.select(mode.id),
					}));
				}
			},
			reporter: { id: 'FusionclawActionModePicker', name: 'FusionclawActionModePicker', includeOptions: true },
		};

		super(action, options, pickerOptions, actionWidgetService, keybindingService, contextKeyService, telemetryService);
		this.keys = contextKeyService;

		// The extension republishes on every turn and on every policy change,
		// so follow the key rather than polling.
		this._register(contextKeyService.onDidChangeContext(event => {
			if (event.affectsSome(new Set([FUSIONCLAW_ACTION_MODE_KEY, FUSIONCLAW_ACTION_MODE_MENU_KEY])) && this.element) {
				this.renderLabel(this.element);
			}
		}));
	}

	private select(mode: string): void {
		// The extension re-validates against the served policy and republishes;
		// this never writes the context key itself.
		this.commandService.executeCommand(FUSIONCLAW_SET_ACTION_MODE_COMMAND, mode)
			.then(undefined, () => undefined);
	}

	private currentLabel(): string {
		const menu = parseActionModeMenu(this.keys.getContextKeyValue(FUSIONCLAW_ACTION_MODE_MENU_KEY));
		const current = menu?.modes.find(mode => mode.id === menu.current);
		return current?.label ?? localize('fusionclawActionMode.fallback', "Behavior");
	}

	override render(container: HTMLElement): void {
		super.render(container);
		container.classList.add('fusionclaw-action-mode-picker-item');
	}

	protected override renderLabel(element: HTMLElement): IDisposable | null {
		this.setAriaLabelAttributes(element);
		const label = this.currentLabel();
		const labelElements = [...renderLabelWithIcons(`$(${Codicon.listOrdered.id})`)];
		// Collapse to the icon alone when the toolbar is tight, the way the
		// model and agent chips beside this one do.
		if (!this.pickerOptions.compact.get()) {
			labelElements.push(dom.$('span.chat-input-picker-label', undefined, label));
		}
		dom.reset(element, ...labelElements);
		return null;
	}
}

// --- End FusionIDE ---
