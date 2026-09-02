/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FusionClaw. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// --- Start FusionIDE ---

import { $, addDisposableListener, append, EventType } from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';

/**
 * Credit health, in the title bar's left content beside the menu bar.
 *
 * The numbers belong to the desktop: only it knows the wallet, and a meter with
 * no wallet behind it would be a fabricated number. So this renders nothing
 * until `fusionclaw.fusionide-shell` publishes one, and it reads that value
 * from context keys rather than from a service of its own.
 *
 * Context keys, not a new bridge: an extension cannot reach the title bar (no
 * `contributes.menus` slot exists for it), and `setContext` is the one channel
 * the extension host already has into core state. The three keys are referenced
 * as string literals because core must not import from an extension — a renamed
 * key leaves the widget hidden rather than showing a stale figure.
 */
const CREDITS_LABEL_KEY = 'fusionclaw.credits.label';
const CREDITS_TOOLTIP_KEY = 'fusionclaw.credits.tooltip';
const CREDITS_SEVERITY_KEY = 'fusionclaw.credits.severity';

/** Opens FusionClaw billing; contributed by the shell extension. */
const OPEN_BILLING_COMMAND = 'fusionclaw.openBilling';

const OBSERVED_KEYS = new Set([CREDITS_LABEL_KEY, CREDITS_TOOLTIP_KEY, CREDITS_SEVERITY_KEY]);

export class FusionclawCreditsWidget extends Disposable {

	private readonly container: HTMLElement;
	private readonly icon: HTMLElement;
	private readonly name: HTMLElement;
	private readonly label: HTMLElement;

	constructor(
		parent: HTMLElement,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super();

		this.container = append(parent, $('div.fusionclaw-credits'));
		this.container.setAttribute('role', 'button');
		this.container.tabIndex = 0;
		this.icon = append(this.container, $('span.fusionclaw-credits-icon.codicon.codicon-pulse'));
		this.icon.setAttribute('aria-hidden', 'true');
		// Named, not just a number: a bare percentage beside the window chrome
		// reads as part of it and nobody finds the credit meter.
		this.name = append(this.container, $('span.fusionclaw-credits-name'));
		this.name.textContent = localize('fusionclawCredits', "Credits");
		this.label = append(this.container, $('span.fusionclaw-credits-label'));

		this._register(addDisposableListener(this.container, EventType.CLICK, () => this.open()));
		this._register(addDisposableListener(this.container, EventType.KEY_DOWN, event => {
			// Enter and Space, so the widget is reachable without a pointer.
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				this.open();
			}
		}));

		this._register(this.contextKeyService.onDidChangeContext(event => {
			if (event.affectsSome(OBSERVED_KEYS)) {
				this.update();
			}
		}));

		this.update();
	}

	private open(): void {
		this.commandService.executeCommand(OPEN_BILLING_COMMAND)
			.then(undefined, () => undefined);
	}

	private read(key: string): string {
		const value = this.contextKeyService.getContextKeyValue<unknown>(key);
		return typeof value === 'string' ? value : '';
	}

	private update(): void {
		const label = this.read(CREDITS_LABEL_KEY);
		// An absent label is the normal state before the desktop reports a
		// wallet, so collapse rather than showing a placeholder meter.
		this.container.classList.toggle('hidden', label.length === 0);
		if (!label) {
			return;
		}

		this.label.textContent = label;
		const tooltip = this.read(CREDITS_TOOLTIP_KEY);
		this.container.title = tooltip || label;
		this.container.setAttribute(
			'aria-label',
			localize('fusionclawCreditsAria', "Credits: {0}. Open FusionClaw billing.", label),
		);

		const severity = this.read(CREDITS_SEVERITY_KEY);
		this.container.classList.toggle('warning', severity === 'warning');
		this.container.classList.toggle('error', severity === 'error');
	}
}

// --- End FusionIDE ---
