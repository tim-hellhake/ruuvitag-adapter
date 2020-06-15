/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';
import { hPa } from './ruuvitag-parser';

export function scaleTemperature(temperature:number,config:any):number {
    return +temperature.toFixed(config.temperaturePrecision);
}

export function scaleHumidity(humidity:number,config:any):number {
    return +humidity.toFixed(config.humidityPrecision);
}

export function scalePressure(pressure:number,config:any):number {
    return +pressure.toFixed(config.pressurePrecision);
}

export function getMetadata(version: number, config: any) {
    switch (version) {
        case 3:
            return {
                humidity: {
                    min: 0,
                    max: 100,
                    step: Math.max(0.5, config.humidityStep),
                },
                temperature: {
                    min: -127.99,
                    max: 127.99,
                    step: Math.max(0.01, config.temperatureStep),
                },
                pressure: {
                    min: hPa(50000),
                    max: hPa(101325),
                    step: Math.max(hPa(1),config.pressureStep),
                },
                batteryVoltage: {
                    min: 1.6,
                    max: 3.647,
                    step: 0.001
                }
            };
        case 5:
            return {
                temperature: {
                    min: -163.835,
                    max: 163.835,
                    step: Math.max(0.005,config.temperatureStep),
                },
                humidity: {
                    min: 0,
                    max: 100,
                    step: Math.max(0.0025,config.humidityStep),
                },
                pressure: {
                    min: hPa(50000),
                    max: hPa(101325),
                    step: Math.max(hPa(1),config.pressureStep),
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
                }
            };
    }

    throw `Unknown version ${version}`;
}

export function mergeLoadedConfig(current: any, loaded: any) {
    current.temperaturePrecision = loaded.temperaturePrecision;
    current.humidityPrecision = loaded.humidityPrecision;
    current.pressurePrecision = loaded.pressurePrecision;
    current.temperatureStep = +( 1 / (10 ** loaded.temperaturePrecision) ).toFixed(3) ;
    current.humidityStep = +( 1 / (10 ** loaded.humidityPrecision) ).toFixed(4);
    current.pressureStep = +( 1 / (10 ** loaded.pressurePrecision) ).toFixed(2);
    return current;
}

export function getDefaultConfig() {
    return {
        temperaturePrecision: 1,
        humidityPrecision: 0,
        pressurePrecision: 0,
        temperatureStep: 0.1,
        humidityStep: 1,
        pressureStep: 1,
    };
}
