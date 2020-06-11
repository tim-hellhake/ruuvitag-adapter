/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';

import noble from '@abandonware/noble';

export class RuuviTag extends Device {
  private temperatureProperty: Property;

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
  }

  setData(manufacturerData: Buffer) {
    const digits = manufacturerData.readUInt8(5) / 100;
    const binary = manufacturerData.readUInt8(4);
    const value = binary & 0x7f;
    const sign = binary & 0x80 ? -1 : 1;
    const temperature = sign * (value + digits);

    this.temperatureProperty.setCachedValue(temperature);
    this.notifyPropertyChanged(this.temperatureProperty);
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
