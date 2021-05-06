/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { parse, hPa, DataV5 } from './ruuvitag-parser';
import { expect } from 'chai';
import 'mocha';

const manufacturerId = '0499';

describe('Data Format 3 Protocol Specification (RAWv1)', () => {
  // https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_03.md

  const sample = parse(Buffer.from(`${manufacturerId}03291A1ECE1EFC18F94202CA0B53`, 'hex'));
  const minimum = parse(Buffer.from(`${manufacturerId}0300FF6300008001800180010000`, 'hex'));
  const maximum = parse(Buffer.from(`${manufacturerId}03FF7F63FFFF7FFF7FFF7FFFFFFF`, 'hex'));

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

  it('accX should be parsed correctly', () => {
    expect(sample.accX).to.equal(-1);
    expect(minimum.accX).to.equal(-32.767);
    expect(maximum.accX).to.equal(32.767);
  });

  it('accY should be parsed correctly', () => {
    expect(sample.accY).to.equal(-1.726);
    expect(minimum.accY).to.equal(-32.767);
    expect(maximum.accY).to.equal(32.767);
  });

  it('accZ should be parsed correctly', () => {
    expect(sample.accZ).to.equal(0.714);
    expect(minimum.accZ).to.equal(-32.767);
    expect(maximum.accZ).to.equal(32.767);
  });
});

describe('Data Format 5 Protocol Specification (RAWv2)', () => {
  // https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_05.md

  const sample = <DataV5>(
    parse(Buffer.from(`${manufacturerId}0512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F`, 'hex'))
  );
  const minimum = <DataV5>(
    parse(Buffer.from(`${manufacturerId}058001000000008001800180010000000000CBB8334C884F`, 'hex'))
  );
  const maximum = <DataV5>(
    parse(Buffer.from(`${manufacturerId}057FFFFFFEFFFE7FFF7FFF7FFFFFDEFEFFFECBB8334C884F`, 'hex'))
  );
  const invalid = <DataV5>(
    parse(Buffer.from(`${manufacturerId}058000FFFFFFFF800080008000FFFFFFFFFFFFFFFFFFFFFF`, 'hex'))
  );

  it('version should be parsed correctly', () => {
    expect(sample.version).to.equal(5);
  });

  it('temperature should be parsed correctly', () => {
    expect(sample.temperature).to.equal(24.3);
    expect(minimum.temperature).to.equal(-163.835);
    expect(maximum.temperature).to.equal(163.835);
    expect(invalid.temperature).to.be.null;
  });

  it('humidity should be parsed correctly', () => {
    expect(sample.humidity).to.equal(53.49);
    expect(minimum.humidity).to.equal(0);
    expect(maximum.humidity).to.equal(163.835);
    expect(invalid.humidity).to.be.null;
  });

  it('pressure should be parsed correctly', () => {
    expect(sample.pressure).to.equal(hPa(100044));
    expect(minimum.pressure).to.equal(hPa(50000));
    expect(maximum.pressure).to.equal(hPa(115534));
    expect(invalid.pressure).to.be.null;
  });

  it('tx power should be parsed correctly', () => {
    expect(sample.txPower).to.equal(4);
    expect(minimum.txPower).to.equal(-40);
    expect(maximum.txPower).to.equal(20);
    expect(invalid.txPower).to.be.null;
  });

  it('batteryVoltage should be parsed correctly', () => {
    expect(sample.batteryVoltage).to.equal(2.977);
    expect(minimum.batteryVoltage).to.equal(1.6);
    expect(maximum.batteryVoltage).to.equal(3.646);
    expect(invalid.batteryVoltage).to.be.null;
  });

  it('accX should be parsed correctly', () => {
    expect(sample.accX).to.equal(0.004);
    expect(minimum.accX).to.equal(-32.767);
    expect(maximum.accX).to.equal(32.767);
  });

  it('accY should be parsed correctly', () => {
    expect(sample.accY).to.equal(-0.004);
    expect(minimum.accY).to.equal(-32.767);
    expect(maximum.accY).to.equal(32.767);
  });

  it('accZ should be parsed correctly', () => {
    expect(sample.accZ).to.equal(1.036);
    expect(minimum.accZ).to.equal(-32.767);
    expect(maximum.accZ).to.equal(32.767);
  });

  it('movementCounter should be parsed correctly', () => {
    expect(sample.movementCounter).to.equal(66);
    expect(minimum.movementCounter).to.equal(0);
    expect(maximum.movementCounter).to.equal(254);
    expect(invalid.movementCounter).to.be.null;
  });

  it('measurementCounter should be parsed correctly', () => {
    expect(sample.measurementCounter).to.equal(205);
    expect(minimum.measurementCounter).to.equal(0);
    expect(maximum.measurementCounter).to.equal(65534);
    expect(invalid.measurementCounter).to.be.null;
  });
});
