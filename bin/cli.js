#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const commander = require('commander');
const path = require('path');
const winston = require('winston');
const VaultEnv = require('../src/VaultEnv');
const pkg = require('../package.json');

const VERSION = pkg.version;

commander
    .version(VERSION)
    .arguments('<exec>')
    .option(
        '-c, --config <path>',
        'Config file',
        (v) => path.resolve(v)
    )
    .option(
        '-v, --verbosity <level>',
        'Level of verbosity (according to RFC 5424)',
        /^(debug|info|notice|warning|error|critical|alert|emergency)$/i,
        'warning'
    )
    .option(
        '--kill_signal <signal>',
        'Kill signal to send to child process. Can be one of SIGHUP,SIGTERM,SIGINT,SIGQUIT,SIGUSR1,SIGUSR2',
        /^(SIGHUP|SIGTERM|SIGINT|SIGQUIT|SIGUSR1|SIGUSR2)$/
    )
    .parse(process.argv);

const exec = commander.args.join(' ');
const config = require(commander.config);

function loggerFactory(channel) {
    return new winston.Logger({
        level: config.verbosity,
        levels: {
            emergency: 0,
            alert: 1,
            critical: 2,
            error: 3,
            warning: 4,
            notice: 5,
            info: 6,
            debug: 7
        },
        transports: [
            new winston.transports.Console({
                formatter(options) {
                    return `[${new Date().toString()}] [${_.upperCase(options.level)}] (${channel}) - ${options.message}`;
                }
            })
        ]
    });
}

const vaultEnv = new VaultEnv(
    exec,
    _.extend(config, {
        killSignal: (commander.kill_signal ? commander.kill_signal : config.kill_signal) || 'SIGTERM',
        logger: (channel) => loggerFactory(channel ? `vault_env/${channel}` : 'vault_env')
    })
);

(async () => {
    const logger = loggerFactory('vault_env');

    logger.info('Vault Env (version %s)', VERSION);
    const {stdout, stderr} = await vaultEnv.run((code) => {
        logger.info('child process has finished execution. it was returned exit code %s', code);
        process.exit(code);
    });

    stdout.pipe(process.stdout);
    stderr.pipe(process.stderr);

    _.each(['SIGINT', 'SIGTERM'], (signal) => {
        process.on(signal, () => {
            logger.info('receive %s signal.', signal);
            vaultEnv.stop().then(({code}) => process.exit(code));
        });
    });
})();