/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'gateway-addon' {
  class Event {
    constructor(device: any, name: string, data?: any);
  }

  interface EventDescription {
    name: string;
    metadata: EventMetadata;
  }

  interface EventMetadata {
    description: string;
    type: string;
  }

  class Property {
    public name: string;

    protected title: string;

    constructor(device: Device, name: string, propertyDescr: any);

    public setCachedValue(value: any): void;

    public setCachedValueAndNotify(value: any): void;

    public setValue(value: any): Promise<void>;
  }

  class Device {
    protected '@context': string;

    protected '@type': string[];

    public id: string;

    public name: string;

    protected description: string;

    constructor(adapter: Adapter, id: string);

    public properties: Map<string, Property>;

    public notifyPropertyChanged(property: Property): void;

    public addAction(name: string, metadata: any): void;

    public events: Map<string, EventDescription>;

    public eventNotify(event: Event): void;
  }

  class Adapter {
    constructor(addonManager: any, id: string, packageName: string);

    public handleDeviceAdded(device: Device): void;
  }

  class Database {
    constructor(packageName: string, path?: string);

    public open(): Promise<void>;

    public loadConfig(): Promise<any>;

    public saveConfig(config: any): Promise<void>;
  }
}
