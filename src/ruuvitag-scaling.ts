/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';
import { hPa } from './ruuvitag-parser';

export function scaleTemperature(temperature: number, config: any) : number {
    return +temperature.toFixed(config.temperaturePrecision);
}

export function scaleHumidity(humidity: number, config: any) : number {
    return +humidity.toFixed(config.humidityPrecision);
}

export function scalePressure(pressure: number, config: any) : number {
    return +pressure.toFixed(config.pressurePrecision);
}

export function getMetadata(version: number, config: any) {
    const temperatureStep = +( 1 / (10 ** config.temperaturePrecision) ).toFixed(3) ;
    const humidityStep = +( 1 / (10 ** config.humidityPrecision) ).toFixed(4);
    const pressureStep = +( 1 / (10 ** config.pressurePrecision) ).toFixed(2);

    switch (version) {
        case 3:
            return {
                humidity: {
                    min: 0,
                    max: 100,
                    step: Math.max(0.5, humidityStep),
                },
                temperature: {
                    min: -127.99,
                    max: 127.99,
                    step: Math.max(0.01, temperatureStep),
                },
                pressure: {
                    min: hPa(50000),
                    max: hPa(101325),
                    step: Math.max(hPa(1),pressureStep),
                },
                batteryVoltage: {
                    min: 1.6,
                    max: 3.647,
                    step: 0.001
                },
                accX: {
                    min: -32.767,
                    max: 32.767,
                    step: 0.001
                },
                accY: {
                    min: -32.767,
                    max: 32.767,
                    step: 0.001
                },
                accZ: {
                    min: -32.767,
                    max: 32.767,
                    step: 0.001
                }
            };
        case 5:
            return {
                temperature: {
                    min: -163.835,
                    max: 163.835,
                    step: Math.max(0.005, temperatureStep),
                },
                humidity: {
                    min: 0,
                    max: 100,
                    step: Math.max(0.0025, humidityStep),
                },
                pressure: {
                    min: hPa(50000),
                    max: hPa(101325),
                    step: Math.max(hPa(1), pressureStep),
                },
                txPower: {
                    min: -40,
                    max: 20,
                    step: 2
                },
                batteryVoltage: {
                    min: 1.6,
                    max: 3.647,
                    step: 0.001
                },
                accX: {
                    min: -32.767,
                    max: 32.767,
                    step: 0.001
                },
                accY: {
                    min: -32.767,
                    max: 32.767,
                    step: 0.001
                },
                accZ: {
                    min: -32.767,
                    max: 32.767,
                    step: 0.001
                },
                movementCounter: {
                    min: 0,
                    max: 254,
                    step: 1
                },
                measurementCounter:{
                    min: 0,
                    max: 65534,
                    step: 1
                }
            };
    }

    throw `Unknown version ${version}`;
}
