/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// --- Start FusionIDE ---
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { GettingStartedInputSerializer } from '../../browser/gettingStarted.js';

suite('FusionIDE startup restoration', () => {
	const store = ensureNoDisposablesAreLeakedInTestSuite();

	for (const startupEditor of ['none', 'welcomePage']) {
		test(`restores a welcome tab only when startup allows it (${startupEditor})`, () => {
			const configuration = new TestConfigurationService({ workbench: { startupEditor } });
			store.add(configuration.onDidChangeConfigurationEmitter);
			const instantiation = store.add(new InstantiationService(new ServiceCollection([IConfigurationService, configuration])));
			const result = new GettingStartedInputSerializer().deserialize(instantiation, JSON.stringify({ selectedCategory: 'SetupWeb', selectedStep: 'pickColorThemeWeb' }));
			if (result) {
				store.add(result);
			}
			assert.deepStrictEqual(result ? { category: result.selectedCategory, step: result.selectedStep } : undefined,
				startupEditor === 'none' ? undefined : { category: 'SetupWeb', step: 'pickColorThemeWeb' });
		});
	}
});
// --- End FusionIDE ---
