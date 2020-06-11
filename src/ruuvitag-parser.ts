/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export function parse(manufacturerData: Buffer) {
    const digits = manufacturerData.readUInt8(5) / 100;
    const binary = manufacturerData.readUInt8(4);
    const value = binary & 0x7f;
    const sign = binary & 0x80 ? -1 : 1;
    const temperature = sign * (value + digits);

    return {
        temperature
    }
}
