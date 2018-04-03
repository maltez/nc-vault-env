'use strict';

const winston = require('winston');
const _ = require('lodash');

module.exports = function factory(channel, verbosity, format) {
    return new winston.Logger({
        level: verbosity,
        levels: {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4,
        },
        transports: [
            new winston.transports.Console({
                formatter(options) {
                    const level = _.upperCase(options.level);

                    if (format === 'json') {
                        return JSON.stringify({
                            level: level,
                            channel: channel,
                            message: options.message
                        });
                    }

                    return `(${channel}) [${level}] - ${options.message}`;
                }
            })
        ]
    })
};