/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// --- Start FusionIDE ---
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorSerializer } from '../../../common/editor.js';
import { GettingStartedInput } from './gettingStartedInput.js';

export class GettingStartedInputSerializer implements IEditorSerializer {
	public canSerialize(editorInput: GettingStartedInput): boolean {
		return true;
	}

	public serialize(editorInput: GettingStartedInput): string {
		return JSON.stringify({ selectedCategory: editorInput.selectedCategory, selectedStep: editorInput.selectedStep });
	}

	public deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): GettingStartedInput | undefined {

		return instantiationService.invokeFunction(accessor => {
			// --- Start FusionIDE ---
			if (accessor.get(IConfigurationService).getValue<string>('workbench.startupEditor') === 'none') {
				return undefined;
			}
			// --- End FusionIDE ---
			try {
				const { selectedCategory, selectedStep } = JSON.parse(serializedEditorInput);
				return new GettingStartedInput({ selectedCategory, selectedStep });
			} catch { }
			return new GettingStartedInput({});

		});
	}
}

// --- End FusionIDE ---
