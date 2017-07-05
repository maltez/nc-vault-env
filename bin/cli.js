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
        'path to config file',
        (v) => path.resolve(v)
    )
    .option(
        '-v, --verbosity <level>',
        'level of verbosity. "info" by default.',
        /^(error|warn|info|verbose|debug|silly)$/i,
        'info'
    )
    .on('--help', function () {
        console.log();
        console.log(' Config: ');
        console.log(configExample('  '));
        console.log();
        console.log('  Usage:');
        console.log('    $ vault-env --verbosity debug -c ./config.json');
        console.log();
    })
    .parse(process.argv);

const exec = commander.args.join(' ');
const config = require(commander.config);

(() => {
    const logger = new winston.Logger({
        level: commander.verbosity,
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
                    return `[${_.upperCase(options.level)}] - ${options.message}`;
                }
            })
        ]
    });

    const vaultEnv = new VaultEnv(
        exec,
        _.extend({logger: logger}, config)
    );

    logger.info('Vault Env (version %s)', VERSION);

    return vaultEnv
        .run((code, signal) => {
            logger.info(
                'child process has finished execution. code=%s signal=%s',
                code === null ? 'None' : code,
                signal === null ? 'None' : signal,
            );
            process.exit(code);
        })
        .then((stream) => {
            stream.stdout.pipe(process.stdout);
            stream.stderr.pipe(process.stderr);
            _.each([
                'SIGHUP',
                'SIGTERM',
                'SIGINT',
                'SIGQUIT',
                'SIGUSR1',
                'SIGUSR2'
            ], (signal) => {
                process.on(signal, () => {
                    logger.info('receive %s signal.', signal);
                    vaultEnv.kill(signal);
                });
            });
        });

})().catch((reason) => {
    console.error(reason);
    process.exit(1);
});


function configExample(pad) {
    return JSON.stringify({
        vault: {
            address: "https://vault.example.com",
            auth: {
                type: "appRole",
                config: {
                    role_id: "__YOUR_ROLE_ID_HERE__"
                }
            }
        },
        secrets: [
            {
                path: "mysql/<%= env('NODE_ENV') %>/my_database",
                format: "DATABASE_<%= key %>"
            },
            {
                path: "secret/my_secret_key",
                format: "SECRET_<%= key %>"
            }
        ]
    }, null, '  ').split('\n').map((line) => `${pad}${line}`).join('\n');
}