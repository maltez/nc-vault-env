'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');
const mockery = require('mockery');
const expect = chai.expect;

chai.use(require('sinon-chai'));

async function delay(ms) {
    return new Promise((resolve) => _.delay(resolve, ms));
}

const nullLogger = _.fromPairs(
    _.map(['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'], (level) => [level, _.noop])
);

describe('VaultEnv', function () {
    this.timeout(60 * 1000);
    this.slow(30 * 1000);

    it('e2e', async function () {
        let client;
        const secretResponses = {
            'staging/mysql': {
                username: 'vault_is_awesome',
                password: 'root_is_good_password',
            },
            'secret/private_key': {
                value: '-----BEGIN RSA PRIVATE KEY-----...'
            }
        };
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        mockery.registerMock('node-vault-client', class {
            constructor() {
                client = this;

                function getResponse(data) {
                    return {
                        getData() {
                            return data;
                        }
                    };
                }

                this.read = async (path) => getResponse(secretResponses[path]);
            }
        });

        const env = `_ENV_${Math.floor(Math.random() * 1000)}`;
        try {
            process.env[env] = 'staging';

            const VaultEnv = require('../src/VaultEnv');
            const vaultEnv = new VaultEnv('bash ./loop.sh --print_env 1', {
                logger: nullLogger,
                cwd: __dirname,
                vault: {
                    address: ''
                },
                secrets: [
                    {
                        path: `<%= env('${env}') %>/mysql`,
                        format: 'DATABASE_<%= key %>'
                    },
                    {
                        path: `secret/private_key`,
                        format: 'SECRET_<%= key %>'
                    }
                ]
            });

            const {stdout} = await vaultEnv.run(_.noop);

            let out = '';

            stdout.on('data', (buffer) => out += buffer.toString());

            await delay(2000);

            _.each(
                [
                    ['SECRET_VALUE', secretResponses['secret/private_key'].value],
                    ['DATABASE_USERNAME', secretResponses['staging/mysql'].username],
                    ['DATABASE_PASSWORD', secretResponses['staging/mysql'].password],
                ],
                ([variable, value]) => expect(out).to.include(`${variable}=${value}`)
            )
            ;

        }
        catch (e) {
            throw e;
        }
        finally {
            mockery.deregisterMock('node-vault-client');
            mockery.disable();
            delete process.env[env];
        }
    });

});