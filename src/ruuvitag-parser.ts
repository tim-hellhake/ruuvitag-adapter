/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export function parse(manufacturerData: Buffer) {
    let temperature = null;
    let humidity = null;
    let pressure = null;
    let batteryVoltage = null;
    let txPower = null;

    if (manufacturerData[2]!==5) {
        const digits = manufacturerData.readUInt8(5) / 100;
        const binary = manufacturerData.readUInt8(4);
        const value = binary & 0x7f;
        const sign = binary & 0x80 ? -1 : 1;
        temperature = sign * (value + digits);
    }

    if (manufacturerData[2]===5) {
        if (manufacturerData.readInt16BE(3)!==0x8000) {
            temperature = manufacturerData.readInt16BE(3) / 200;
        }

        if (manufacturerData.readUInt16BE(5)!==65535) {
            humidity = manufacturerData.readUInt16BE(5) / 400;
        }

        if (manufacturerData.readUInt16BE(7)!==65535) {
            pressure = manufacturerData.readUInt16BE(7) / 100 + 500;
        }

        if (manufacturerData.readUInt16BE(15)!==65535) {
            const powerInfo = manufacturerData.readUInt16BE(15);
            batteryVoltage = (powerInfo >>> 5) / 1000.0 + 1.6;
            txPower = (powerInfo & 0b11111) * 2 - 40;
        }
    }

    return {
        temperature,
        humidity,
        pressure,
        batteryVoltage,
        txPower,
    }
}
