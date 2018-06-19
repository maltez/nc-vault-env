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

            list(path) {
                return Promise.resolve({
                    getData() {
                        return {keys: Object.keys(secretResponses[path])};
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

    it('Should skip vault envs when dummy mode', function () {
        const fakeSecrets = [
            {
                path: `mysql`,
                format: 'database_<%= key %>',
                upcase: false
            }
        ];
        return new Promise((resolve) => {
            process.env.VAULTENV_DUMMY = 'true';
            const stream = new WritableStream();
            const spawn = {
                command: 'echo',
                args:    ['Hello, Vault!'],
                options: {stdio: ['ignore', 'pipe', 'ignore']},
                onExit(code) {
                    _.delay(() => {
                        expect(stream.toString()).to.match(/Hello,\sVault!\n/);
                        expect(code).to.equal(0);
                        resolve();
                    }, 100);
                }
            };
            const vaultEnv = instantiate(spawn, {secrets: fakeSecrets, ...bootOptions});

            vaultEnv
                .run()
                .then((child) => child.stdout.pipe(stream))
        })
            .catch(e => {
                process.env.VAULTENV_DUMMY = undefined;
                throw e;
            });
    });

    describe('Secrets', function() {
        it('keys templating: upcase=false', function() {
          const secrets = [
              {
                  path: `mysql`,
                  format: 'database_<%= key %>',
                  upcase: false
              }
          ];

          const secretResponses = {
              'mysql': {
                  username: 'vault_is_awesome',
                  password: 'root_is_good_password',
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
                                  ['database_username', secretResponses['mysql'].username],
                                  ['database_password', secretResponses['mysql'].password],
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
        it('keys templating: upcase=true', function () {
            const env = `_NODE_ENV_${Math.round(Math.random() * 1000)}`;
            process.env[env] = 'staging';

            const secrets = [
                {
                    path: `<%= env('${env}') %>/mysql`,
                    format: 'DATABASE_<%= key %>',
                    upcase: true
                }
            ];

            const secretResponses = {
                'staging/mysql': {
                    username: 'vault_is_awesome',
                    password: 'root_is_good_password',
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
        it('keys templating: default behavior', function () {
            const env = `_NODE_ENV_${Math.round(Math.random() * 1000)}`;
            process.env[env] = 'staging';

            const secrets = [
                {
                    path: `<%= env('${env}') %>/mysql`,
                    format: 'DATABASE_<%= key %>'
                }
            ];

            const secretResponses = {
                'staging/mysql': {
                    username: 'vault_is_awesome',
                    password: 'root_is_good_password',
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

        it('values templating: format', function () {
            const env = `_NODE_ENV_${Math.round(Math.random() * 1000)}`;
            process.env[env] = 'staging';

            const secrets = [
                {
                    path: `<%= env('${env}') %>/mysql`,
                    key: 'CONNECTION_STRING',
                    format: `<%= username %>:<%= password %>@<%= env('${env}') %>`
                }
            ];

            const secretResponses = {
                'staging/mysql': {
                    username: 'vault_is_awesome',
                    password: 'root_is_good_password',
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
                            expect(stream.toString()).to.include(`CONNECTION_STRING=${secretResponses['staging/mysql'].username}:${secretResponses['staging/mysql'].password}@staging`);
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


        it('keys templating: upcase=false', function () {
            const envName = `_NODE_ENV_${Math.round(Math.random() * 1000)}`;
            const envValue = `VALUE_${Math.round(Math.random() * 1000)}`;
            process.env[envName] = envValue;

            const secrets = [{
                "path": `secret/re/<%= env('${envName}') %>/shared`,
                "format": "<%= folder %>:<%= key %>",
                "folder": true
            },{
                "path": `secret/re/<%= env('${envName}') %>/mss_name`,
                "format": "<%= folder %>:<%= key %>",
                "folder": true,
                "upcase": false
            }];
            /*
            secret/re/<env name>/shared/
                /rmq
                    'username': 'ccc'
                    'password': 'ddd'
                /newrelic
                    'apikey': 'zzz'
            secret/re/<env name>/mss_name/
                /some_config_key
                    'value': 'aaa'
             */
            const secretResponses = {
                // list mock
                [`secret/re/${envValue}/shared`]:   {
                    rmq:      {},
                    newrelic: {}
                },
                [`secret/re/${envValue}/mss_name`]: {
                    some_config_key: {},
                },

                // read mock
                [`secret/re/${envValue}/shared/rmq`]: {
                    username: 'vault_is_awesome',
                    password: 'root_is_good_password',
                },
                [`secret/re/${envValue}/shared/newrelic`]: {
                    apikey: 'vault_is_powerful',
                },
                [`secret/re/${envValue}/mss_name/some_config_key`]: {
                    Value: 'another_secret_array_element',
                },
            };
            return new Promise((resolve) => {
                const stream = new WritableStream();

                const spawn = {
                    command: 'env',
                    args:    [],
                    stdio:   'ignore',
                    options: {stdio: ['ignore', 'pipe', 'ignore']},
                    onExit(code) {
                        _.delay(() => {
                            const output = stream.toString();
                            _.each(
                                [
                                    /*
                                    RMQ:USERNAME=vault_is_awesome
                                    RMQ:PASSWORD=root_is_good_password
                                    NEWRELIC:APIKEY=vault_is_powerful
                                    some_config_key:Value=another_secret_array_element
                                     */
                                    ['RMQ:USERNAME', secretResponses[`secret/re/${envValue}/shared/rmq`].username],
                                    ['RMQ:PASSWORD', secretResponses[`secret/re/${envValue}/shared/rmq`].password],
                                    ['NEWRELIC:APIKEY', secretResponses[`secret/re/${envValue}/shared/newrelic`].apikey],
                                    ['some_config_key:Value', secretResponses[`secret/re/${envValue}/mss_name/some_config_key`].Value],
                                ],
                                (v) => expect(output).to.include(`${v[0]}=${v[1]}`)
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
});
