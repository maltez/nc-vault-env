'use strict';

const _ = require('lodash');
const chai = require('chai');
const expect = chai.expect;

const Secret = require('../src/Secret');

describe('Secret', function () {
    it('templating: .path should allow to use env(...)', () => {

        const env = `_TEST_NODE_ENV_${Math.random()}`;
        process.env[env] = 'staging';

        const secret = new Secret(`some/<%= env('${env}') %>/vault/path`, {
            format: ''
        });

        expect(secret.path).to.equal('some/staging/vault/path');

        delete process.env[env]
    });

    it('templating: env(...) should throw if variable not set ', () => {
        const env = `_TEST_NODE_ENV_${Math.random()}`;
        expect(() => new Secret(`some/<%= env('${env}') %>/vault/path`, {format: ''}))
            .throw(`Environment variable "${env}" must be set.`)
    });

    it('templating: should allow to <%= key %> for format', () => {
        const secret = new Secret(`some/staging/vault/path`, {
            format: 'VAR_<%= key %>',
        });

        expect(secret.parseResponse({PROP: 'value'})).to.deep.equal({
            VAR_PROP: 'value'
        });
    });

    it('should uppercase names of env vars', () => {
        _.each(['prop1', 'Prop2', 'pRop3', 'pRop4', 'pRoP4', 'PROP5', 'prop_u6'], (prop) => {

            const secret = new Secret(`some/staging/vault/path`, {
                format: '<%= key %>',
            });

            const response = secret.parseResponse({
                [prop]: 0
            });

            expect(response).to.deep.equal({
                [prop.toUpperCase()]: 0
            });
        })
    });

    it('should parse response with multiple values', () => {
        const secret = new Secret(`some/staging/vault/path`, {
            format: '<%= key %>',
        });

        const response = secret.parseResponse({
            a: 0,
            b: 0,
            c: 0,
        });

        expect(response).to.deep.equal({
            A: 0,
            B: 0,
            C: 0,
        });
    });
});