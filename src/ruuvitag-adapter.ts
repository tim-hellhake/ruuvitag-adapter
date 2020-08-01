/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property, Event } from 'gateway-addon';

import noble from '@abandonware/noble';
import { parse, DataV3, DataV5 } from './ruuvitag-parser';
import { getMetadata, scaleTemperature, scaleHumidity, scalePressure, getDefaultConfig, mergeLoadedConfig } from './ruuvitag-scaling';

export class RuuviTag extends Device {
  private temperatureProperty: Property;
  private humidityProperty: Property;
  private pressureProperty: Property;
  private batteryProperty: Property;
  private txPowerProperty?: Property;
  private movementCounterProperty?: Property;
  private lastMovementCounter = 0;
  private config: any;

  constructor(adapter: Adapter, manifest: any, id: string, address: string, manufacturerData: Buffer, config: any) {
    super(adapter, `${RuuviTag.name}-${id}`);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['TemperatureSensor', 'HumiditySensor'];
    this.name = `RuuviTag (${address || id})`;
    this.description = manifest.description;
    this.config = config;

    const data = parse(manufacturerData);
    const metadata = getMetadata(data.version, config);

    this.temperatureProperty = new Property(this, 'temperature', {
      type: 'number',
      '@type': 'TemperatureProperty',
      minimum: metadata.temperature.min,
      maximum: metadata.temperature.max,
      multipleOf: metadata.temperature.step,
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true
    });

    this.properties.set('temperature', this.temperatureProperty);

    this.humidityProperty = new Property(this, 'humidity', {
      type: 'number',
      '@type': 'HumidityProperty',
      minimum: metadata.humidity.min,
      maximum: metadata.humidity.max,
      multipleOf: metadata.humidity.step,
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
      multipleOf: metadata.pressure.step,
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

    if (data.version == 5) {
      this.movementCounterProperty = new Property(this, 'movementCounter', {
        type: 'integer',
        minimum: metadata.movementCounter?.min,
        maximum: metadata.movementCounter?.max,
        multipleOf: metadata.movementCounter?.step,
        title: 'Movement counter',
        description: 'The number of detected movements',
        readOnly: true
      });

      this.properties.set('movementCounter', this.movementCounterProperty);

      this.events.set('movement', {
        name: 'movement',
        metadata: {
          description: 'Movement detected',
          type: 'string'
        }
      });
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

    if (humidity !== null) {
      this.humidityProperty.setCachedValueAndNotify(scaleHumidity(humidity, this.config));
    }

    if (temperature !== null) {
      this.temperatureProperty.setCachedValueAndNotify(scaleTemperature(temperature, this.config));
    }

    if (pressure !== null) {
      this.pressureProperty.setCachedValueAndNotify(scalePressure(pressure, this.config));
    }

    if (batteryVoltage !== null) {
      this.batteryProperty.setCachedValueAndNotify(batteryVoltage);
    }
  }

  setDataV5(data: DataV5) {
    const {
      txPower,
      movementCounter
    } = data;

    if (this.txPowerProperty && txPower !== null) {
      this.txPowerProperty.setCachedValueAndNotify(txPower);
    }

    if (this.movementCounterProperty && movementCounter !== null) {
      this.movementCounterProperty.setCachedValueAndNotify(movementCounter);

      if(this.lastMovementCounter != movementCounter) {
        this.lastMovementCounter = movementCounter;
        this.eventNotify(new Event(this, 'movement'));
      }
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

    const config = mergeLoadedConfig(getDefaultConfig(), manifest.moziot.config);

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
