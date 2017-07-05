'use strict';

const _ = require('lodash');
const chai = require('chai');
const mockery = require('mockery');
const expect = chai.expect;

// Null Logger
const logger = _.fromPairs(_.map(['error', 'warn', 'info', 'debug', 'trace'], (prop) => [prop, _.noop]));

describe('VaultEnv', function () {
    this.timeout(15 * 1000);

    const bootOptions = {
        logger: logger,
        vault: {
            address: 'https://vault.example.com'
        },
        cwd: __dirname
    };

    let secretResponses = {};

    function instantiate(exec, options, _secretResponses) {
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

        return new VaultEnv(exec, options);
    }

    it('Should run process', function () {
        const vaultEnv = instantiate('bash -c "echo Hello, VaultEnv!"', bootOptions);

        return new Promise((resolve) => {
            let out = '';
            vaultEnv
                .run((code) => {
                    expect(out).to.match(/Hello,\sVaultEnv!/);
                    expect(code).to.equal(0);
                    resolve();
                })
                .then((stream) => {
                    stream.stdout.on('data', (buffer) => out += buffer.toString())
                });
        });
    });

    it('Should send signal to child process', function () {
        const vaultEnv = instantiate('sleep 60', bootOptions);
        const SIGNAL = 'SIGTERM';

        return new Promise((resolve) => {
            vaultEnv
                .run((code, signal) => {
                    expect(signal).to.equal(SIGNAL);
                    resolve();
                });

            _.delay(() => vaultEnv.kill(SIGNAL), 10);
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

        const vaultEnv = instantiate('env', _.extend({secrets}, bootOptions), secretResponses);

        return new Promise((resolve) => {
            let out = '';
            vaultEnv
                .run(() => {
                    _.each(
                        [
                            ['SECRET_VALUE', secretResponses['secret/private_key'].value],
                            ['DATABASE_USERNAME', secretResponses['staging/mysql'].username],
                            ['DATABASE_PASSWORD', secretResponses['staging/mysql'].password],
                        ],
                        (v) => expect(out).to.include(`${v[0]}=${v[1]}`)
                    );
                    resolve();
                })
                .then((stream) => {
                    stream.stdout.on('data', (buffer) => out += buffer.toString())
                });
        });
    });
});