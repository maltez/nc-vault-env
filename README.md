# nc-vault-env

[![npm version](https://badge.fury.io/js/nc-vault-env.svg)](https://www.npmjs.com/package/nc-vault-env)

This package provides a convenient way to launch a subprocess with environment variables populated from Vault.

## How it works?

This tool fetches specified secrets then run your app with environment variables that contain secrets.
Also, propagate received signals to subprocess.

## Getting started[.](#getting_started)

#### For Windows users only ;)

Generally you can also try to execute steps below w/o use of Docker 
but do it on your own risk. 

1. Install Docker
1. `docker run --rm -it -v ${PWD}:/codebase node:8 bash`
1. `cd codebase/`

#### Add secrets to Vault
1. Vault install [hashi-corp-vault](https://www.vaultproject.io/downloads.html)
1. Configure Vault CLI
    We need to setup following environment variable:
    
    ```bash
    export VAULT_ADDR=https://vault.devops.namecheap.net
    ```
1. Run command to sign in into Vault server
    ```bash
    vault auth -method=ldap username=<your_AD_username>
    ```
    
    Input your AD password then
    
    Expected response looks like this
    
    ```bash
    Success! You are now authenticated. The token information displayed below
    is already stored in the token helper. You do NOT need to run "vault login"
    again. Future Vault requests will automatically use this token.
    
    Key                    Value
    ---                    -----
    token                  <token>
    token_accessor         <token>
    token_duration         768h
    token_renewable        true
    token_policies         [default <roles>]
    token_meta_policies    default,<team>
    token_meta_username    <your_username>
    ```

1. Add secret to the vault.
    ```bash
      $  vault write secret/data password=pass**123 login=jack_sparrow
      Success! Data written to: secret/data
    ```
#### Install & configure nc-vault-env
1. Install  npm package
    NPM Package: [nc-vault-env](https://www.npmjs.com/package/nc-vault-env)
    `nc-vault-env` written in nodejs, so you need to install suitable versions.
    It currently has been tested with `6.x` and `8.x`.

    ```bash
    npm install -g nc-vault-env
    ```

1. Create config.json
    In working directory you create config.json file

    ```javascript
    {
      "vault": {
        "address": "<%= env('VAULT_ADDR') %>",
        "auth": {
          "type": "token",
          "config": {
              "token": "<%= env('VAULT_TOKEN') %>"
          }
        }
      },
      "secrets": [
        {
          "path": "secret/data",
          "format": "MY_ENV_<%= key %>",
          "upcase": true
        }
      ]
    }
    ```
1. Export Vault auth token to env variable

    ```bash
    $ export VAULT_TOKEN=$(cat ~/.vault-token)
    ```
1. Run command 
    ```bash
    $ nc-vault-env -c ./config.json -- printenv
 
    MY_ENV_PASSWORD=pass**123
    MY_ENV_LOGIN=jack_sparrow
    ```
    WARNING: This command working on linux, ubuntu and macOS only.
#### Integrate with your application
1. For correct work in dockerfile you need add following lines:

    ```docker
      RUN apt-get update \
            && apt-get install -y build-essential curl \
            && curl -sL https://deb.nodesource.com/setup_8.x | bash - \
            && apt-get install -y nodejs \
            && npm install -g nc-vault-env \
            && rm -rf /var/lib/apt/lists/*

      COPY vault-env.conf.json .
      CMD ["nc-vault-env", "-c", "./vault-env.conf.json", "--", "./<your_start_script>.sh"]
    ```
## CLI

Options:

| option           | description                                                                              |
|------------------|------------------------------------------------------------------------------------------|
| -c, --config     | path to configuration file.                                                              |
| -v, --verbosity  | verbosity level. Supported "error", "warn", "info", "debug", "trace". Default is "info". |
| -f, --log-format | logging format. Supported "json" and "text". Default is "json".                          |

#### Dummy mode
When you just want to skip secrets fetching and just run app/script without them we may use *dummy mode*.
Just pass env variable `VAULTENV_DUMMY=true`, bash example:
```bash
VAULTENV_DUMMY=true nc-vault-env -c ./vault-env.conf.json -- ./<your_start_script>.sh
```

## Configuration File API

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
      "mount": "<%= env('VAULT_AWS_AUTH_MOUNT') %>",

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
      "format": "RMQ_<%= key %>",

      // This tells vault-env to convert environment variable keys to uppercase (which is more common and a bit more standard).
      // optional, by default is true
      "upcase": true
    },
    // Another behaviour:
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
    // Another behaviour:
    // * value templating with folders
    //
    // secrets like this:
    //  /shared
    // path: secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/shared/mssql
    // {
    //   "username": "awesome",
    //   "password: "securePa$$word"
    // }
    // path: secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/shared/rmq
    // {
    //   "username": "awesome2",
    //   "password: "!securePa$$word"
    // }
    //
    //  /local
    // path: secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/local/newrelic
    // {
    //   "apikey": "awesomesecurePa$$word"
    // }
    //
    // should produce environment variables based on content of the "shared" and "local"
    // result will be like this:
    //
    // MSSQL:USERNAME="awesome"
    // MSSQL:PASSWORD="securePa$$word"
    // RMQ:USERNAME="awesome2"
    // RMQ:PASSWORD="!securePa$$word"
    // NEWRELIC:APIKEY="awesomesecurePa$$word"
    //
    {
      // path to secret
      "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/shared",
      // env name template
      "format": "<%= folder %>:<%= key %>",
      "upcase": true,
      // fetch folders and pass them to value templating
      "folder": true
    },
    {
      // and so on
      "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/local",
      "format": "<%= folder %>:<%= key %>",
      "upcase": true,
      "folder": true
    }
  ]
}
```

## Templating

Templating based on [Lodash template function](https://lodash.com/docs/#template).

Predefined functions:

| fn  | description                               | usage                      |
|-----|-------------------------------------------|----------------------------|
| env | provides access to environment variables. | <%= env('VAULT_ADDR') %>   |
|     |                                           |                            |

## 

## Troubleshooting

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

## Recipes.
#### Add multiple items in value
  1. For adding multiple values in vault 
      ```bash
        $ vault write secret/data foo=world excited=yes count=1
        Success! Data written to: secret/data
      ```
  1. Secret was added to /secret/data in format:
      ```javascript
        { 
          "foo": "world",
          "excited": "yes",
          "count":1,
        }
      ```
#### Auth section for AWS using
  - Use following code for authorization with Amazon Web Services
    ```javascript
        "auth": {
              "type": "iam",
              "mount": "<%= env('<VAULT_AWS_AUTH_MOUNT>') %>",
              "config": {
                "role": "<%= env('VAULT_ROLE') %>",
                "iam_server_id_header_value": "<%= env('VAULT_ADDR') %>"
              }
        }
    ```
#### Secret format for the mysql connection string
  - For passing connection string from the secrets use following secret configuration:
    ```javascript
      {
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/mysql/creds/rw",
          "format": "server=<%= env('DATABASE_HOST') %>;port=<%= env('DATABASE_PORT') %>;database=<%= env('DATABASE_NAME') %>;uid=<%= username %>;pwd=<%= password %>",
          "key": "ConnectionString",
          "upcase": false
      },
    ```
#### Secret format for ASP.NET Core configuration class
  1. If you have configuration class:
      ```csharp
        public class MyConfiguration
        {
          public string Secret1 {get;set;}
          public string Secret2 {get;set;}
        }
      ```
  1. You add secrets with following name:
      ```bash
        $ vault write secret/data test=12 Secret1=secret Secret2=true
        Success! Data written to: secret/data
      ```
  1. And create secret config section in config.json:
      ```javascript
        {
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/config",
          "format": "<%= key %>",
          "upcase": false
        }
      ```
  1. All configuration will be passed as environment variables.
#### Nested classes
  1. If you have nested configuration class:
      ```csharp
        public class MyConfiguration
        {
          public ItemClass Item { get; set; }
        }

        public class ItemClass
        {
          public string SubItem { get; set; }
        }
      ```
  1. And create secret config section:
      ```javascript
        {
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/config",
          "format": "<%= value %>",
          "key": "item__subitem",
          "upcase": false
        }
      ```
