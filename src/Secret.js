'use strict';

const _ = require('lodash');
const template = require('./template');

class Secret {
    /**
     * @param {string} path
     * @param {Object} options
     * @param options.format
     */
    constructor(path, {format}) {
        this.path = template(path)();
        this.format = template(format);
    }

    /**
     * @param response
     */
    parseResponse(response) {
        return _.chain(response)
            .map((value, key) => [_.toUpper(this.format({key})), value])
            .fromPairs()
            .value();
    }
}

module.exports = Secret;