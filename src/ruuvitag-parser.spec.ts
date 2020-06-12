/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { parse, hPa, DataV5 } from './ruuvitag-parser';
import { expect } from 'chai';
import 'mocha';

const manufacturerId = '0499'

describe('Data Format 3 Protocol Specification (RAWv1)', () => {
    // https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_03.md

    const sample = parse(Buffer.from(manufacturerId + "03291A1ECE1EFC18F94202CA0B53", "hex"));
    const minimum = parse(Buffer.from(manufacturerId + "0300FF6300008001800180010000", "hex"));
    const maximum = parse(Buffer.from(manufacturerId + "03FF7F63FFFF7FFF7FFF7FFFFFFF", "hex"));

    it('version should be parsed correctly', () => {
        expect(sample.version).to.equal(3);
    });

    it('humidity should be parsed correctly', () => {
        expect(sample.humidity).to.equal(20.5);
        expect(minimum.humidity).to.equal(0);
        expect(maximum.humidity).to.equal(127.5);
    });

    it('temperature should be parsed correctly', () => {
        expect(sample.temperature).to.equal(26.3);
        expect(minimum.temperature).to.equal(-127.99);
        expect(maximum.temperature).to.equal(127.99);
    });

    it('pressure should be parsed correctly', () => {
        expect(sample.pressure).to.equal(hPa(102766));
        expect(minimum.pressure).to.equal(hPa(50000));
        expect(maximum.pressure).to.equal(hPa(115535));
    });

    it('voltage should be parsed correctly', () => {
        expect(sample.batteryVoltage).to.equal(2.899);
        expect(minimum.batteryVoltage).to.equal(0);
        expect(maximum.batteryVoltage).to.equal(65.535);
    });
});

describe('Data Format 5 Protocol Specification (RAWv2)', () => {
    // https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_05.md

    const sample = <DataV5>parse(Buffer.from(manufacturerId + "0512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F", "hex"));
    const minimum = <DataV5>parse(Buffer.from(manufacturerId + "058001000000008001800180010000000000CBB8334C884F", "hex"));
    const maximum = <DataV5>parse(Buffer.from(manufacturerId + "057FFFFFFEFFFE7FFF7FFF7FFFFFDEFEFFFECBB8334C884F", "hex"));

    it('version should be parsed correctly', () => {
        expect(sample.version).to.equal(5);
    });

    it('humidity should be parsed correctly', () => {
        expect(sample.temperature).to.equal(24.3);
        expect(minimum.temperature).to.equal(-163.835);
        expect(maximum.temperature).to.equal(163.835);
    });

    it('temperature should be parsed correctly', () => {
        expect(sample.humidity).to.equal(53.49);
        expect(minimum.humidity).to.equal(0);
        expect(maximum.humidity).to.equal(163.835);
    });

    it('pressure should be parsed correctly', () => {
        expect(sample.pressure).to.equal(hPa(100044));
        expect(minimum.pressure).to.equal(hPa(50000));
        expect(maximum.pressure).to.equal(hPa(115534));
    });

    it('tx power should be parsed correctly', () => {
        expect(sample.txPower).to.equal(4);
        expect(minimum.txPower).to.equal(-40);
        expect(maximum.txPower).to.equal(20);
    });

    it('batteryVoltage should be parsed correctly', () => {
        expect(sample.batteryVoltage).to.equal(2.977);
        expect(minimum.batteryVoltage).to.equal(1.6);
        expect(maximum.batteryVoltage).to.equal(3.646);
    });
});
