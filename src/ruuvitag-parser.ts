/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export function hPa(pa: number) {
    return pa / 100;
}

export interface DataV3 {
    version: number,
    humidity: number | null,
    temperature: number | null,
    pressure: number | null,
    batteryVoltage: number | null
}

export interface DataV5 {
    version: number,
    temperature: number | null,
    humidity: number | null,
    pressure: number | null,
    batteryVoltage: number | null,
    txPower: number | null
}

export function parse(manufacturerData: Buffer): DataV3 | DataV5 {
    const payload = manufacturerData.subarray(2);
    const version = payload.readUInt8(0);

    switch (version) {
        case 3:
            return parse3(payload);
        case 5:
            return parse5(payload);
    }

    throw `Unknown version ${version}`;
}

export function parse3(payload: Buffer): DataV3 {
    const version = payload.readUInt8(0);
    const humidity = payload.readUInt8(1) * 0.5;

    const binary = payload.readUInt8(2);
    const digits = payload.readUInt8((3)) / 100;
    const value = binary & 0x7f;
    const sign = binary & 0x80 ? -1 : 1;
    const temperature = sign * (value + digits);

    const pressure = hPa(payload.readUInt16BE(4) + 50000);
    const batteryVoltage = payload.readUInt16BE(12) / 1000;

    return {
        version,
        humidity,
        temperature,
        pressure,
        batteryVoltage
    }
}

export function parse5(payload: Buffer): DataV5 {
    const version = payload.readUInt8(0);

    let temperature = null;
    if (payload.readUInt16BE(1) != 0x8000) {
        temperature = payload.readInt16BE(1) * 0.005;
    }

    let humidity = null;
    if (payload.readUInt16BE(3) != 65535) {
        humidity = payload.readUInt16BE(3) * 0.0025;
    }

    let pressure = null;
    if (payload.readUInt16BE(5) != 65535) {
        pressure = hPa(payload.readUInt16BE(5) + 50000);
    }

    let txPower = null;
    if ((payload.readUInt16BE(13) & 0b11111) != 31) {
        txPower = (payload.readUInt16BE(13) & 0b11111) * 2 - 40;
    }

    let batteryVoltage = null;
    if ((payload.readUInt16BE(13) >> 5) != 2047) {
        batteryVoltage = parseFloat((((payload.readUInt16BE(13) >> 5) / 1000) + 1.6).toFixed(3));
    }

    return {
        version,
        temperature,
        humidity,
        pressure,
        txPower,
        batteryVoltage,
    }
}
