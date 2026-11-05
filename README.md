# Campsite Finder

Find local campsites near you.

## Setup

```bash
npm install
npm run dev
```

## Tech Stack

- React + Vite
- TypeScript

## Supabase MCP

This repo is also a Murmur plugin (`.claude-plugin/plugin.json` + `.mcp.json`) that gives
agents the hosted [Supabase MCP server](https://supabase.com/docs/guides/getting-started/mcp)
in read-only mode. It authenticates with a Supabase personal access token in
`SUPABASE_ACCESS_TOKEN`; the token is never committed.

To enable it for the `myworkspace` workspace:

```bash
# 1. Store the token (create one at https://supabase.com/dashboard/account/tokens).
read -rsp 'Supabase PAT: ' T; echo
printf '%s' "$T" | murmur secret set --workspace myworkspace SUPABASE_ACCESS_TOKEN

# 2. Mount the secret and add this repo as a plugin.
murmur get workspace myworkspace > ws.yaml
yq '.runtimeSecretMounts += [{"name": "myworkspace/SUPABASE_ACCESS_TOKEN", "mountType": "MOUNT_TYPE_ENV"}]
  | .plugins += [{"name": "supabase", "cloneUrl": "https://github.com/Claire-s-Campground-Finder/campsite-finder", "ref": "main"}]' ws.yaml \
  | murmur set workspace myworkspace --if-generation "$(yq '.generation' ws.yaml)"
```

Plugins install at agent start, so spawn a new agent to pick it up. To scope the server to
one project, append `&project_ref=<id>` to the URL in `.mcp.json` and bump the plugin version.
To allow writes (migrations, SQL mutations), drop `read_only=true`.
