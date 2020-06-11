/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { parse } from './ruuvitag-parser';
import { expect } from 'chai';
import 'mocha';

const manufacturerId = '0499'

describe('Parse v3 format', () => {
    it('should parse correctly', () => {
        const result = parse(Buffer.from(manufacturerId + "03291A1ECE1EFC18F94202CA0B53", "hex"));
        expect(result.temperature).to.equal(26.3);
    });

    it('should parse minimum values correctly', () => {
        const result = parse(Buffer.from(manufacturerId + "0300FF6300008001800180010000", "hex"));
        expect(result.temperature).to.equal(-127.99);
    });

    it('should parse maximum values correctly', () => {
        const result = parse(Buffer.from(manufacturerId + "03FF7F63FFFF7FFF7FFF7FFFFFFF", "hex"));
        expect(result.temperature).to.equal(127.99);
    });
});

