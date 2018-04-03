# nc-vault-env

[![npm version](https://badge.fury.io/js/nc-vault-env.svg)](https://badge.fury.io/js/nc-vault-env

This package provides a convenient way to launch a subprocess with environment variables populated from Vault.

# How it works?

This tool fetches specified secrets then run your app with environment variables that contain secrets.
Also, propagate received signals to subprocess.

# Installation

NPM Package: [nc-vault-env](https://www.npmjs.com/package/nc-vault-env)

`nc-vault-env` written in nodejs, so you need to install suitable versions.
It currently has been tested with `6.x` and `8.x`.

```bash
npm install -g nc-vault-env
```

# Usage

## Run

```bash
nc-vault-env -c config.json -- run_my_app.sh
```

## CLI

Options:

| option           | description                                                                              |
|------------------|------------------------------------------------------------------------------------------|
| -c, --config     | path to configuration file.                                                              |
| -v, --verbosity  | verbosity level. Supported "error", "warn", "info", "debug", "trace". Default is "info". |
| -f, --log-format | logging format. Supported "json" and "text". Default is "json".                          |

## Configuration File

Configuration files are written in json.

```js
{
  // This denotes the start of the configuration section for Vault.
  "vault": {
    // This is the address of the Vault. The protocol (http(s)) portion
    // of the address is required.
    //
    // Like this: https://vault.devops.namecheap.net
    "address": "<%= env('VAULT_ADDR') %>",

    // This part related to authentication configuration
    "auth": {

      // Supported auth types:
      // * token - see https://www.vaultproject.io/docs/auth/token.html
      // * iam - see https://www.vaultproject.io/docs/auth/aws.html#iam-auth-method
      // * appRole - see https://www.vaultproject.io/docs/auth/approle.html
      "type": "token",

      // Auth backend configuration

      // token:
      // It can be suitable to debugging locally
      //
      // "config": {
      //   "token": "<%= env('VAULT_TOKEN') %>"
      // }

      // iam:
      // It is preferred way to run within aws
      //
      // "config": {
      //  "role": "my_awesome_api",
      //  "iam_server_id_header_value": "<%= env('VAULT_ADDR') %>"
      // }

      // appRole:
      //
      // "config": {
      //  "role_id": "b2a7cfb9-d09a-49c4-9e9a-24127c6dbbf6"
      // }

      "config": {
        // ...
      }
    }
  },

  // This specifies a secret in Vault to fetch.
  "secrets": [
    // There are two different behaviours:

    // * value templating
    //
    // secret like this:
    // {
    //   "username": "awesome",
    //   "password: "securePa$$word"
    // }
    //
    // should produce environment variable like this:
    // ConnectionString="user id=awesome;password=securePa$$word"
    {
      // path to secret
      "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/mssql",
      // value template
      "format": "user id=<%= username %>;password=<%= password %>",
      // env variable to populate
      "key": "ConnectionString"
    },

    // * key templating
    //
    // secret like this:
    // {
    //   "username": "awesome",
    //   "password: "securePa$$word"
    // }
    //
    // should produce multiple environment variables like this:
    // RMQ_USERNAME="awesome"
    // RMQ_PASSWORD="securePa$$word"
    //
    // Note that names will be uppercased.
    {
      "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/rmq",
      "format": "RMQ_<%= key %>"
    }
  ]
}
```

## Templating

Templating based on https://lodash.com/docs/#template[Lodash template function].

Predefined functions:

| fn  | description                               | usage                      |
|-----|-------------------------------------------|----------------------------|
| env | provides access to environment variables. | <%= env('VAULT_ADDR') %>   |
|     |                                           |                            |

# Troubleshooting

For debugging purpose you can run this locally using you vault token (token auth backend).
This way assumes that you have access to all of your app's secrets.

Please be aware that debug or trace log level prints secret to stdout, so be careful with enable this level on real environment.

```bash
cat config.json
# {
#   "vault": {
#     "address": "<%= env('VAULT_ADDR') %>",
#     "auth": {
#       "type": "token",
#       "config": {
#         "token": "<%= env('VAULT_TOKEN') %>"
#       }
#     }
#   },
#   ...
# }
export VAULT_ADDR=https://vault.devops.namecheap.net
export VAULT_TOKEN=$(cat ~/.vault-token)
nc-vault-env -c config.json -f text -v trace -- run_my_app.sh
```