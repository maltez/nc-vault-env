'use strict';

const _ = require('lodash');

module.exports = function ms4human(ms) {
    const sec = ms / 1000;

    return _.flatten(
        [
            [Math.floor(sec / (60 * 60)), 'h'],
            [Math.floor(sec % (60 * 60) / 60), 'm'],
            [sec % 60, 's'],
        ]
    ).join('');
};