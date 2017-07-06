# EnvVault

# Configuration
```json
{
  "vault": {
    "address": "https://vault.example.com",
    "auth": {
      "type": "approle",
      "config": {
        "role_id": "APP_ROLE_ID"
      }
    }
  },
  "secrets": [
    {
      "path": "<%= env('NODE_ENV') %>/mysql/main/creds/app_auth",
      "format": "DATABASE_<%= key %>"
    },
    {
      "path": "secret/some_secret",
      "format": "SECRET_<%= key %>"
    }
  ]
}
```

# Usage
```bash
# Help; Usage examples; Config example;
node ./bin/cli.js --help

# Run
env NODE_ENV=staging node ./bin/cli.js -c config.json -v debug command_for_run
```