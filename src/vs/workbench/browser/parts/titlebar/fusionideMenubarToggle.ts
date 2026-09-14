/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// --- Start FusionIDE ---
import { $, addDisposableListener, append, EventType } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { CustomMenubarControl } from './menubarControl.js';

/** Keeps the real workbench menus, including their keyboard and command behavior. */
export class FusionideMenubarToggle extends Disposable {
	private static readonly storageKey = 'fusionide.menubar.expanded';
	private pinnedExpanded: boolean;
	private menuVisible: boolean;
	private readonly button: HTMLButtonElement;

	get expanded(): boolean { return this.pinnedExpanded || this.menuVisible; }
	get height(): number { return this.expanded ? 28 : 20; }

	constructor(
		parent: HTMLElement,
		menubar: Pick<CustomMenubarControl, 'setVisibilityOverride' | 'onVisibilityChange'>,
		menuElement: HTMLElement,
		onDidChangeExpansion: () => void,
		@IStorageService private readonly storageService: IStorageService,
		@IHoverService hoverService: IHoverService,
	) {
		super();
		this.pinnedExpanded = storageService.getBoolean(FusionideMenubarToggle.storageKey, StorageScope.PROFILE, true);
		this.menuVisible = this.pinnedExpanded;
		this.button = append(parent, $('button.fusionide-menubar-toggle'));
		this.button.type = 'button';
		menuElement.id = 'fusionide-main-menubar';
		this.button.setAttribute('aria-controls', menuElement.id);
		const icon = append(this.button, $('span.codicon'));
		icon.setAttribute('aria-hidden', 'true');
		const hover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.button, ''));
		const render = () => {
			const label = this.expanded
				? localize('fusionide.collapseMenus', "Hide IDE Menus")
				: localize('fusionide.expandMenus', "Show IDE Menus");
			this.button.setAttribute('aria-label', label);
			this.button.setAttribute('aria-expanded', String(this.expanded));
			icon.classList.toggle('codicon-chevron-up', this.expanded);
			icon.classList.toggle('codicon-chevron-down', !this.expanded);
			hover.update(label);
		};
		this._register(menubar.onVisibilityChange(visible => {
			const wasExpanded = this.expanded;
			this.menuVisible = visible;
			render();
			if (wasExpanded !== this.expanded) {
				onDidChangeExpansion();
			}
		}));
		this._register(addDisposableListener(this.button, EventType.CLICK, () => {
			this.pinnedExpanded = !this.expanded;
			this.menuVisible = this.pinnedExpanded;
			this.storageService.store(FusionideMenubarToggle.storageKey, this.pinnedExpanded, StorageScope.PROFILE, StorageTarget.MACHINE);
			menubar.setVisibilityOverride(this.pinnedExpanded ? 'visible' : 'toggle');
			render();
			onDidChangeExpansion();
		}));
		this._register(toDisposable(() => {
			this.button.remove();
			menuElement.removeAttribute('id');
		}));
		menubar.setVisibilityOverride(this.pinnedExpanded ? 'visible' : 'toggle');
		render();
	}
}
// --- End FusionIDE ---
