/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const noble = require('@abandonware/noble');

const {
  Adapter,
  Device,
  Property
} = require('gateway-addon');

class RuuviTag extends Device {
  constructor(adapter, manifest, id) {
    super(adapter, `${RuuviTag.name}-${id}`);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['TemperatureSensor'];
    this.name = manifest.display_name;
    this.description = manifest.description;

    this.addProperty({
      type: 'number',
      '@type': 'TemperatureProperty',
      minimum: -127.99,
      maximum: 127.99,
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true
    });
  }

  addProperty(description) {
    const property = new Property(this, description.title, description);
    this.properties.set(description.title, property);
  }

  setData(manufacturerData) {
    const digits = manufacturerData.readUInt8(5) / 100;
    const binary = manufacturerData.readUInt8(4);
    const value = binary & 0x7f;
    const sign = binary & 0x80 ? -1 : 1;
    const temperature = sign * (value + digits);

    const property = this.properties.get('temperature');
    property.setCachedValue(temperature);
    this.notifyPropertyChanged(property);
  }
}

class RuuviTagAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, RuuviTagAdapter.name, manifest.name);
    this.pollInterval = manifest.moziot.config.pollInterval;
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
        const id = peripheral.id;
        let knownDevice = this.knownDevices[id];

        if (!knownDevice) {
          console.log(`Detected new RuuviTag with id ${id}`);
          knownDevice = new RuuviTag(this, manifest, id);
          this.handleDeviceAdded(knownDevice);
          this.knownDevices[id] = knownDevice;
        }

        knownDevice.setData(manufacturerData);
      }
    });
  }
}

module.exports = RuuviTagAdapter;
