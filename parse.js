const dataFormats = require('./dataformats/index');

module.exports = {
    parseManufacturerData: dataBuffer => {
        let dataFormat = dataBuffer[2];
        switch (dataFormat) {
            case 3:
                return dataFormats.format_3.parse(dataBuffer);
            case 5:
                return dataFormats.format_5.parse(dataBuffer);
            default:
                return new Error("Data format not supported");
        }
    }
};