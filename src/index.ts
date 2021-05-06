/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

'use strict';

import { RuuviTagAdapter } from './ruuvitag-adapter';

export = (addonManager: any, manifest: any) => new RuuviTagAdapter(addonManager, manifest);
