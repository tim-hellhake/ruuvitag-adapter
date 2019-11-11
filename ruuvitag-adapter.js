/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const noble = require('@abandonware/noble');
const parser = require('./parse');

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
      multipleOf: 0.01,
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true
    });

    this.addProperty({
      type: 'number',
      minimum: 0,
      maximum: 100,
      multipleOf: 0.5,
      unit: '%',
      title: 'humidity',
      description: 'The relative humidity',
      readOnly: true
    });

    this.addProperty({
      type: 'number',
      minimum: 500,
      maximum: 1156,
      multipleOf: 0.01,
      unit: 'hPa',
      title: 'pressure',
      description: 'The atmospheric pressure',
      readOnly: true
    });

    this.addProperty({
      type: 'number',
      minimum: 0,
      maximum: 4000,
      multipleOf: 1,
      unit: 'mV',
      title: 'battery',
      description: 'The battery voltage',
      readOnly: true
    });
  }

  addProperty(description) {
    const property = new Property(this, description.title, description);
    this.properties.set(description.title, property);
  }

  setData(manufacturerData) {
    const parsedData = parser.parseManufacturerData(manufacturerData);

    const tempProperty = this.properties.get('temperature');
    tempProperty.setCachedValue(parsedData.temperature);
    this.notifyPropertyChanged(tempProperty);

    const humiProperty = this.properties.get('humidity');
    humiProperty.setCachedValue(parsedData.humidity);
    this.notifyPropertyChanged(humiProperty);

    const pressureProperty = this.properties.get('pressure');
    pressureProperty.setCachedValue((parsedData.pressure / 100).toFixed(2));
    this.notifyPropertyChanged(pressureProperty);

    const batteryProperty = this.properties.get('battery');
    batteryProperty.setCachedValue(parsedData.battery);
    this.notifyPropertyChanged(batteryProperty);
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
