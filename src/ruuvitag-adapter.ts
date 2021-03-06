/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property, Event, AddonManagerProxy } from 'gateway-addon';

import noble from '@abandonware/noble';
import { parse, DataV3, DataV5 } from './ruuvitag-parser';
import { getMetadata, scaleTemperature, scaleHumidity, scalePressure } from './ruuvitag-scaling';
import { Config } from './config';

export class RuuviTag extends Device {
  private temperatureProperty: Property<number>;

  private humidityProperty: Property<number>;

  private pressureProperty: Property<number>;

  private batteryProperty: Property<number>;

  private accXProperty?: Property<number>;

  private accYProperty?: Property<number>;

  private accZProperty?: Property<number>;

  private txPowerProperty?: Property<number>;

  private movementCounterProperty?: Property<number>;

  private measurementCounterProperty?: Property<number>;

  private packetLossProperty?: Property<number>;

  private lastMovementCounter = 0;

  private lastMeasurementCounter = 0;

  private config: Config;

  constructor(
    adapter: Adapter,
    manifest: Record<string, unknown>,
    id: string,
    address: string,
    manufacturerData: Buffer,
    config: Config
  ) {
    super(adapter, `${RuuviTag.name}-${id}`);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['TemperatureSensor', 'HumiditySensor', 'BarometricPressureSensor'];
    this.setTitle(`RuuviTag (${address || id})`);
    this.setDescription(manifest.description as string);
    this.config = config;

    const data = parse(manufacturerData);
    const metadata = getMetadata(data.version, config);

    if (config.debug) {
      console.log(`Received ${JSON.stringify(data)} from ${id}`);
    }

    const { acceleration, txPower, movementCounter, measurementCounter } = config.features ?? {};

    this.temperatureProperty = new Property(this, 'temperature', {
      type: 'number',
      '@type': 'TemperatureProperty',
      minimum: metadata.temperature.min,
      maximum: metadata.temperature.max,
      multipleOf: metadata.temperature.step,
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true,
    });

    this.addProperty(this.temperatureProperty);

    this.humidityProperty = new Property(this, 'humidity', {
      type: 'number',
      '@type': 'HumidityProperty',
      minimum: metadata.humidity.min,
      maximum: metadata.humidity.max,
      multipleOf: metadata.humidity.step,
      unit: '%',
      title: 'humidity',
      description: 'The relative humidity',
      readOnly: true,
    });

    this.addProperty(this.humidityProperty);

    this.pressureProperty = new Property(this, 'pressure', {
      type: 'number',
      '@type': 'BarometricPressureProperty',
      minimum: metadata.pressure.min,
      maximum: metadata.pressure.max,
      multipleOf: metadata.pressure.step,
      unit: 'hPa',
      title: 'Atmospheric pressure',
      description: 'The atmospheric pressure',
      readOnly: true,
    });

    this.addProperty(this.pressureProperty);

    this.batteryProperty = new Property(this, 'battery', {
      type: 'number',
      '@type': 'LevelProperty',
      minimum: metadata.batteryVoltage.min,
      maximum: metadata.batteryVoltage.max,
      multipleOf: metadata.batteryVoltage.step,
      unit: 'volt',
      title: 'Battery',
      description: 'The battery voltage',
      readOnly: true,
    });

    this.addProperty(this.batteryProperty);

    if (acceleration) {
      this.accXProperty = new Property(this, 'accX', {
        type: 'number',
        '@type': 'LevelProperty',
        minimum: metadata.accX.min,
        maximum: metadata.accX.max,
        multipleOf: metadata.accX.step,
        unit: 'metre per second squared',
        title: 'Acceleration x',
        readOnly: true,
      });

      this.addProperty(this.accXProperty);

      this.accYProperty = new Property(this, 'accY', {
        type: 'number',
        '@type': 'LevelProperty',
        minimum: metadata.accY.min,
        maximum: metadata.accY.max,
        multipleOf: metadata.accY.step,
        unit: 'metre per second squared',
        title: 'Acceleration y',
        readOnly: true,
      });

      this.addProperty(this.accYProperty);

      this.accZProperty = new Property(this, 'accZ', {
        type: 'number',
        '@type': 'LevelProperty',
        minimum: metadata.accZ.min,
        maximum: metadata.accZ.max,
        multipleOf: metadata.accZ.step,
        unit: 'metre per second squared',
        title: 'Acceleration z',
        readOnly: true,
      });

      this.addProperty(this.accZProperty);
    }

    if (data.version == 5) {
      if (txPower) {
        this.txPowerProperty = new Property(this, 'txPower', {
          type: 'integer',
          '@type': 'LevelProperty',
          minimum: metadata.txPower?.min,
          maximum: metadata.txPower?.max,
          multipleOf: metadata.txPower?.step,
          unit: 'dBm',
          title: 'transmission power',
          description: 'The transmission power in decibels',
          readOnly: true,
        });

        this.addProperty(this.txPowerProperty);
      }

      if (movementCounter) {
        this.movementCounterProperty = new Property(this, 'movementCounter', {
          type: 'integer',
          minimum: metadata.movementCounter?.min,
          maximum: metadata.movementCounter?.max,
          multipleOf: metadata.movementCounter?.step,
          title: 'Movement counter',
          description: 'The number of detected movements',
          readOnly: true,
        });

        this.addProperty(this.movementCounterProperty);

        this.addEvent('movement', {
          name: 'movement',
          metadata: {
            description: 'Movement detected',
            type: 'string',
          },
        });
      }

      if (measurementCounter) {
        this.measurementCounterProperty = new Property(this, 'measurementCounter', {
          type: 'integer',
          minimum: metadata.measurementCounter?.min,
          maximum: metadata.measurementCounter?.max,
          multipleOf: metadata.measurementCounter?.step,
          title: 'Measurement counter',
          description: 'The number of measurements',
          readOnly: true,
        });

        this.addProperty(this.measurementCounterProperty);

        this.packetLossProperty = new Property(this, 'packetLoss', {
          type: 'integer',
          minimum: metadata.measurementCounter?.min,
          maximum: metadata.measurementCounter?.max,
          multipleOf: metadata.measurementCounter?.step,
          title: 'Packet loss',
          description: 'The number of lost packets',
          readOnly: true,
        });

        this.addProperty(this.packetLossProperty);
      }
    }
  }

  setData(manufacturerData: Buffer): void {
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

  setDataV3(data: DataV3): void {
    const { humidity, temperature, pressure, batteryVoltage, accX, accY, accZ } = data;

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

    if (accX !== null) {
      this.accXProperty?.setCachedValueAndNotify(accX);
    }

    if (accY !== null) {
      this.accYProperty?.setCachedValueAndNotify(accY);
    }

    if (accZ !== null) {
      this.accZProperty?.setCachedValueAndNotify(accZ);
    }
  }

  setDataV5(data: DataV5): void {
    const { txPower, movementCounter, measurementCounter } = data;

    if (this.txPowerProperty && txPower !== null) {
      this.txPowerProperty.setCachedValueAndNotify(txPower);
    }

    if (this.movementCounterProperty && movementCounter !== null) {
      this.movementCounterProperty.setCachedValueAndNotify(movementCounter);

      if (this.lastMovementCounter != movementCounter) {
        this.lastMovementCounter = movementCounter;
        this.eventNotify(new Event(this, 'movement'));
      }
    }

    if (this.measurementCounterProperty && measurementCounter !== null) {
      this.measurementCounterProperty.setCachedValueAndNotify(measurementCounter);

      if (this.lastMeasurementCounter != measurementCounter) {
        if (typeof this.lastMeasurementCounter === 'number') {
          const diff = Math.abs(this.lastMeasurementCounter - measurementCounter);
          this.packetLossProperty?.setCachedValueAndNotify(diff);
        }
        this.lastMeasurementCounter = measurementCounter;
      }
    }

    this.setDataV3(data);
  }
}

export class RuuviTagAdapter extends Adapter {
  private knownDevices: { [key: string]: RuuviTag } = {};

  constructor(addonManager: AddonManagerProxy, manifest: Record<string, unknown>) {
    super(addonManager, RuuviTagAdapter.name, manifest.name as string);
    this.knownDevices = {};
    addonManager.addAdapter(this);

    const config = {
      temperaturePrecision: 1,
      humidityPrecision: 0,
      pressurePrecision: 0,
      ...(manifest.moziot as { config?: Config }).config,
    };

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
        const { id, address } = peripheral;

        let knownDevice = this.knownDevices[id];

        if (!knownDevice) {
          const data = parse(manufacturerData);
          console.log(`Detected new v${data.version} RuuviTag with id ${id}`);
          knownDevice = new RuuviTag(this, manifest, id, address, manufacturerData, config);
          this.handleDeviceAdded(knownDevice);
          this.knownDevices[id] = knownDevice;
        }

        knownDevice.setData(manufacturerData);
      }
    });
  }
}
