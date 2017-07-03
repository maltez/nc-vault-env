'use strict';

const _ = require('lodash');

module.exports = async function delay(ms) {
    return new Promise((resolve) => _.delay(resolve, ms))
};