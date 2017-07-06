'use strict';

const _ = require('lodash');
const chai = require('chai');
const mockery = require('mockery');
const expect = chai.expect;
const WritableStream = require('memory-streams').WritableStream;

// Null Logger
const logger = _.fromPairs(_.map(['error', 'warn', 'info', 'debug', 'trace'], (prop) => [prop, _.noop]));

describe('VaultEnv', function () {
    this.timeout(15 * 1000);

    const bootOptions = {
        logger: logger,
        vault: {
            address: 'https://vault.example.com',
            auth: {
                type: 'appRole',
                config: {
                    role_id: 'ab2aen4goo5uopheiv9IeM4Ro2eed2cheeWuree4'
                }
            }
        }
    };

    let secretResponses = {};

    function instantiate(spawn, options, _secretResponses) {
        secretResponses = _secretResponses;
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        });

        mockery.registerMock('node-vault-client', class {
            read(path) {
                return Promise.resolve({
                    getData() {
                        return secretResponses[path];
                    }
                });
            }
        });

        const VaultEnv = require('../src/VaultEnv');

        mockery.deregisterMock('node-vault-client');
        mockery.disable();

        return new VaultEnv(spawn, options);
    }

    it('Should run process', function () {
        return new Promise((resolve) => {
            const stream = new WritableStream();
            const spawn = {
                command: 'echo',
                args: ['Hello, Vault!'],
                options: {stdio: ['ignore', 'pipe', 'ignore']},
                onExit(code) {
                    _.delay(() => {
                        expect(stream.toString()).to.match(/Hello,\sVault!\n/);
                        expect(code).to.equal(0);
                        resolve();
                    }, 100);
                }
            };
            const vaultEnv = instantiate(spawn, bootOptions);

            vaultEnv
                .run()
                .then((child) => child.stdout.pipe(stream))
        });
    });

    it('Should send signal to child process', function () {
        return new Promise((resolve) => {
            const SIGNAL = 'SIGTERM';
            const spawn = {
                command: 'sleep',
                args: ['60'],
                stdio: 'ignore',
                options: {},
                onExit(code, signal) {
                    expect(signal).to.equal(SIGNAL);
                    resolve();
                }
            };

            const vaultEnv = instantiate(spawn, bootOptions);

            vaultEnv
                .run()
                .then(() => vaultEnv.kill(SIGNAL))
        });
    });

    it('Should resolve secret to environment variables', function () {
        const env = `_NODE_ENV_${Math.round(Math.random() * 1000)}`;
        process.env[env] = 'staging';

        const secrets = [
            {
                path: `<%= env('${env}') %>/mysql`,
                format: 'DATABASE_<%= key %>'
            },
            {
                path: 'secret/private_key',
                format: 'SECRET_<%= key %>'
            }
        ];

        const secretResponses = {
            'staging/mysql': {
                username: 'vault_is_awesome',
                password: 'root_is_good_password',
            },
            'secret/private_key': {
                value: '-----BEGIN RSA PRIVATE KEY-----...'
            }
        };

        return new Promise((resolve) => {
            const stream = new WritableStream();

            const spawn = {
                command: 'env',
                args: [],
                stdio: 'ignore',
                options: {stdio: ['ignore', 'pipe', 'ignore']},
                onExit(code) {
                    _.delay(() => {
                        _.each(
                            [
                                ['SECRET_VALUE', secretResponses['secret/private_key'].value],
                                ['DATABASE_USERNAME', secretResponses['staging/mysql'].username],
                                ['DATABASE_PASSWORD', secretResponses['staging/mysql'].password],
                            ],
                            (v) => expect(stream.toString()).to.include(`${v[0]}=${v[1]}`)
                        );
                        expect(code).to.equal(0);
                        resolve();
                    }, 100)
                }
            };

            const vaultEnv = instantiate(spawn, _.extend({secrets}, bootOptions), secretResponses);

            vaultEnv
                .run()
                .then((child) => child.stdout.pipe(stream))

        });
    });
});