/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';

import noble from '@abandonware/noble';
import { parse, DataV3, DataV5 } from './ruuvitag-parser';

export class RuuviTag extends Device {
  private temperatureProperty: Property;
  private humidityProperty: Property;
  private pressureProperty: Property;
  private batteryProperty: Property;
  private txPowerProperty: Property;

  constructor(adapter: Adapter, manifest: any, id: string, address?: string) {
    super(adapter, `${RuuviTag.name}-${id}`);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['TemperatureSensor'];
    this.name = `RuuviTag (${address || id})`;
    this.description = manifest.description;

    this.temperatureProperty = new Property(this, 'temperature', {
      type: 'number',
      '@type': 'TemperatureProperty',
      minimum: -127.99,
      maximum: 127.99,
      multipleOf: 0.01,
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true
    });
    this.properties.set('temperature', this.temperatureProperty);

    this.humidityProperty = new Property(this, 'humidity', {
      type: 'number',
      unit: 'percent',
      minimum: -1,
      maximum: 101,
      multipleOf: 0.01,
      title: 'humidity',
      description: 'The relative humidity',
      readOnly: true
    });
    this.properties.set('humidity', this.humidityProperty);

    this.pressureProperty = new Property(this, 'pressure', {
      type: 'number',
      minimum: 800,
      maximum: 1200,
      unit: 'Pa',
      multipleOf: 0.01,
      title: 'pressure',
      description: 'The atmosperic pressure in pascals',
      readOnly: true
    });
    this.properties.set('pressure', this.pressureProperty);

    this.batteryProperty = new Property(this, 'battery', {
      '@type': 'VoltageProperty',
      type: 'number',
      unit: 'volt',
      minimum: 1.5,
      maximum: 3.7,
      multipleOf: 0.001,
      title: 'battery',
      description: 'The battery voltage',
      readOnly: true
    });
    this.properties.set('battery', this.batteryProperty);

    this.txPowerProperty = new Property(this, 'txPower', {
      type: 'integer',
      unit: 'dBm',
      minimum: -40,
      maximum: 20,
      title: 'transmission power',
      description: 'The transmission power in decibels',
      readOnly: true
    });
    this.properties.set('txPower', this.txPowerProperty);
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

    this.humidityProperty.setCachedValue(humidity);
    this.notifyPropertyChanged(this.humidityProperty);

    this.temperatureProperty.setCachedValue(temperature);
    this.notifyPropertyChanged(this.temperatureProperty);

    this.pressureProperty.setCachedValue(pressure);
    this.notifyPropertyChanged(this.pressureProperty);

    this.batteryProperty.setCachedValue(batteryVoltage);
    this.notifyPropertyChanged(this.batteryProperty);
  }

  setDataV5(data: DataV5) {
    const {
      txPower
    } = data;

    this.txPowerProperty.setCachedValue(txPower);
    this.notifyPropertyChanged(this.txPowerProperty);

    this.setDataV3(data);
  }
}

export class RuuviTagAdapter extends Adapter {
  private knownDevices: { [key: string]: RuuviTag } = {};

  constructor(addonManager: any, manifest: any) {
    super(addonManager, RuuviTagAdapter.name, manifest.name);
    this.knownDevices = {};
    addonManager.addAdapter(this);

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
          knownDevice = new RuuviTag(this, manifest, id, address);
          this.handleDeviceAdded(knownDevice);
          this.knownDevices[id] = knownDevice;
        }

        knownDevice.setData(manufacturerData);
      }
    });
  }
}
