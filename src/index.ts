/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { AddonManagerProxy } from 'gateway-addon';
import { RuuviTagAdapter } from './ruuvitag-adapter';

export = function (addonManager: AddonManagerProxy, manifest: Record<string, unknown>): void {
  new RuuviTagAdapter(addonManager, manifest);
};
