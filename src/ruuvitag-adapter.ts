/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property, Database } from 'gateway-addon';

import noble from '@abandonware/noble';
import { parse, DataV3, DataV5, getMetadata } from './ruuvitag-parser';

export class RuuviTag extends Device {
  private temperatureProperty: Property;
  private humidityProperty: Property;
  private pressureProperty: Property;
  private batteryProperty: Property;
  private txPowerProperty?: Property;
  private config: any;

  constructor(adapter: Adapter, manifest: any, id: string, address: string, manufacturerData: Buffer, config: any) {
    super(adapter, `${RuuviTag.name}-${id}`);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['TemperatureSensor'];
    this.name = `RuuviTag (${address || id})`;
    this.description = manifest.description;
    this.config = config;

    const data = parse(manufacturerData);
    const metadata = getMetadata(data.version);

    this.temperatureProperty = new Property(this, 'temperature', {
      type: 'number',
      '@type': 'TemperatureProperty',
      minimum: metadata.temperature.min,
      maximum: metadata.temperature.max,
      multipleOf: Math.max(
        metadata.temperature.step,
        config.temperatureStep),
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true
    });

    this.properties.set('temperature', this.temperatureProperty);

    this.humidityProperty = new Property(this, 'humidity', {
      type: 'number',
      '@type': 'LevelProperty',
      minimum: metadata.humidity.min,
      maximum: metadata.humidity.max,
      multipleOf: Math.max(
        metadata.humidity.step,
        config.humidityStep),
      unit: '%',
      title: 'humidity',
      description: 'The relative humidity',
      readOnly: true
    });

    this.properties.set('humidity', this.humidityProperty);

    this.pressureProperty = new Property(this, 'pressure', {
      type: 'number',
      '@type': 'LevelProperty',
      minimum: metadata.pressure.min,
      maximum: metadata.pressure.max,
      multipleOf: Math.max(
        metadata.pressure.step,
        config.pressureStep),
      unit: 'hPa',
      title: 'Atmospheric pressure',
      description: 'The atmospheric pressure',
      readOnly: true
    });

    this.properties.set('pressure', this.pressureProperty);

    this.batteryProperty = new Property(this, 'battery', {
      type: 'number',
      '@type': 'LevelProperty',
      minimum: metadata.batteryVoltage.min,
      maximum: metadata.batteryVoltage.max,
      multipleOf: metadata.batteryVoltage.step,
      unit: 'volt',
      title: 'Battery',
      description: 'The battery voltage',
      readOnly: true
    });

    this.properties.set('battery', this.batteryProperty);

    if (data.version == 5) {
      this.txPowerProperty = new Property(this, 'txPower', {
        type: 'integer',
        '@type': 'LevelProperty',
        minimum: metadata.txPower?.min,
        maximum: metadata.txPower?.max,
        multipleOf: metadata.txPower?.step,
        unit: 'dBm',
        title: 'transmission power',
        description: 'The transmission power in decibels',
        readOnly: true
      });

      this.properties.set('txPower', this.txPowerProperty);
    }
  }

  setData(manufacturerData: Buffer) {
    const data = parse(manufacturerData);

    switch (data.version) {
      case 3:
        this.setDataV3(<DataV3>data);
        break;
      case 5:
        this.setDataV5(<DataV5>data);
        break;
    }
  }

  setDataV3(data: DataV3) {
    const {
      humidity,
      temperature,
      pressure,
      batteryVoltage
    } = data;

    // convert the reported humidity to the user requested precision
    const h = +humidity.toFixed(this.config.humidityPrecision);
    // use method that does not send a message if there is no change in displayed value
    this.humidityProperty.setCachedValueAndNotify(h);

    const t = +temperature.toFixed(this.config.temperaturePrecision);
    this.temperatureProperty.setCachedValueAndNotify(t);

    const p = +pressure.toFixed(this.config.pressurePrecision);
    this.pressureProperty.setCachedValueAndNotify(p);

    this.batteryProperty.setCachedValueAndNotify(batteryVoltage);
  }

  setDataV5(data: DataV5) {
    const {
      txPower
    } = data;

    if (this.txPowerProperty) {
      this.txPowerProperty.setCachedValueAndNotify(txPower);
    }

    this.setDataV3(data);
  }
}

export class RuuviTagAdapter extends Adapter {
  private knownDevices: { [key: string]: RuuviTag } = {};

  constructor(addonManager: any, manifest: any) {
    super(addonManager, RuuviTagAdapter.name, manifest.name);
    this.knownDevices = {};
    addonManager.addAdapter(this);

    // @tim - the manifest that is loaded (I can't work out how) does not have the id
    //        The id is required to load the configuration, so I hack it in here
    //        Sometimes I've seen a generated manifest.json in the lib directory
    manifest.id = manifest.id || 'ruuvitag-adapter';

    const db = new Database(manifest.id);
    db.open()
    .then(() => { return db.loadConfig(); })
    .then((config) => {
      // convert the user facing configuration to the step value
      config.temperatureStep = +( 1 / (10 ** config.temperaturePrecision) ).toFixed(3);
      config.humidityStep = +( 1 / (10 ** config.humidityPrecision) ).toFixed(4);
      config.pressureStep = +( 1 / (10 ** config.pressurePrecision) ).toFixed(2);
    })
    .catch((e) => console.error(e));

    noble.on('stateChange', (state) => {
      console.log('Noble adapter is %s', state);

      if (state === 'poweredOn') {
        console.log('Start scanning for devices');
        noble.startScanning([], true);
      }
    });

    noble.on('discover', (peripheral) => {
      const manufacturerData = peripheral.advertisement.manufacturerData;

      if (manufacturerData && manufacturerData.readUInt16LE(0) === 0x0499) {
        const {
          id,
          address
        } = peripheral;

        let knownDevice = this.knownDevices[id];

        if (!knownDevice) {
          console.log(`Detected new RuuviTag with id ${id}`);
          knownDevice = new RuuviTag(this, manifest, id, address, manufacturerData, config);
          this.handleDeviceAdded(knownDevice);
          this.knownDevices[id] = knownDevice;
        }

        knownDevice.setData(manufacturerData);
      }
    });
  }
}
