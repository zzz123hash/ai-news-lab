# OmniHex API Transition Server

This folder contains a minimal Ubuntu 24.04 bootstrap plan for the future OmniHex dynamic services:

- API: `https://api.lab.omnihex.xyz`
- Admin: `https://admin.lab.omnihex.xyz`

The current front-end stays on Cloudflare Pages at:

```text
https://lab.omnihex.xyz
```

This transition server does not install BaoTa, Docker, a database, n8n, OpenClaw, or a local large language model. It only prepares a small Node.js API service behind Caddy.

## Files

- `server-setup.sh`: initializes Ubuntu 24.04 with Node.js 22, Caddy, PM2, UFW, and `/opt/omnihex`.
- `api/`: minimal Fastify API project intended to run at `/opt/omnihex/api`.
- `deploy-api.sh`: copies the API project to `/opt/omnihex/api`, installs dependencies, and starts PM2 process `omnihex-api`.
- `Caddyfile.example`: reverse proxy example for `api.lab.omnihex.xyz`.

## Cloudflare DNS

Add this DNS record:

```text
Type: A
Name: api.lab
Target: <your VPS public IPv4>
Proxy status: Proxied or DNS only
```

Cloudflare displays the full hostname as `api.lab.omnihex.xyz`.

Proxy status choices:

- Orange cloud / Proxied: traffic goes through Cloudflare, which can hide the origin IP and provide Cloudflare security features. Use Cloudflare SSL/TLS mode `Full (strict)` after HTTPS works on the origin. Avoid `Flexible`.
- Gray cloud / DNS only: traffic goes directly to the VPS. This is often the simplest first test for Caddy automatic HTTPS, but it exposes the server IP.

Reserve `admin.lab.omnihex.xyz` for the future admin service. Avoid root-level API/Admin service subdomains as the default names for this project.

## Upload

From your local machine:

```sh
scp -r deploy/ubuntu-api-transition root@<server-ip>:/tmp/omnihex-bootstrap
```

Then SSH into the server:

```sh
ssh root@<server-ip>
cd /tmp/omnihex-bootstrap
chmod +x server-setup.sh deploy-api.sh
```

If you normally use the default Ubuntu user instead of root, upload to that user and run the setup script with `sudo`.

## Initialize Ubuntu 24.04

```sh
sudo ./server-setup.sh
```

The setup script:

- runs `apt-get update` and `apt-get upgrade`
- installs `curl`, `git`, `ufw`, `unzip`, `ca-certificates`, and repository helper packages
- installs Node.js 22
- installs Caddy
- installs PM2
- allows `OpenSSH`, `80/tcp`, and `443/tcp` in UFW
- enables UFW
- creates `/opt/omnihex`

It does not disable root login or edit SSH configuration. First confirm that you have another working sudo login before hardening SSH manually.

## Deploy The Minimal API

```sh
./deploy-api.sh
```

The API runs at:

```text
127.0.0.1:3000
```

Health check:

```sh
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{
  "ok": true,
  "service": "OmniHex API",
  "time": "2026-05-02T00:00:00.000Z"
}
```

Public signals:

```sh
curl http://127.0.0.1:3000/public/signals
```

`/public/signals` is the first dynamic front-end enhancement endpoint for OmniHex Lab. The static Cloudflare Pages front-end can request it from `https://api.lab.omnihex.xyz/public/signals` to enrich the homepage while keeping the core page content static and fallback-safe.

Current mock response:

```json
{
  "ok": true,
  "signals": [
    {
      "title": "AI workflows are becoming personal operating systems",
      "summary": "More creators are turning AI prompts, notes, and automations into repeatable daily systems.",
      "category": "life",
      "language": "en"
    },
    {
      "title": "Multilingual AI content remains underexplored",
      "summary": "Small-language AI tutorials and briefs may have lower SEO competition than English and Chinese content.",
      "category": "briefs",
      "language": "en"
    },
    {
      "title": "Prompt libraries can become lightweight digital products",
      "summary": "Practical prompt collections can support affiliate, subscription, or PDF product experiments.",
      "category": "prompts",
      "language": "en"
    }
  ]
}
```

Public API status:

```sh
curl http://127.0.0.1:3000/public/status
```

`/public/status` reports the transition API version, runtime environment, and which prototype features are enabled. It is public and does not require authentication.

Expected response:

```json
{
  "ok": true,
  "service": "OmniHex API",
  "version": "0.1.0",
  "environment": "transition",
  "features": {
    "health": true,
    "signals": true,
    "ai": false,
    "database": false,
    "notion": false
  },
  "time": "2026-05-02T00:00:00.000Z"
}
```

After deploy, run:

```sh
pm2 startup
```

PM2 will print a command. Copy and run that printed command manually, then confirm:

```sh
pm2 save
pm2 status
```

## Configure Caddy

Copy the example Caddyfile:

```sh
sudo cp Caddyfile.example /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Example:

```caddyfile
api.lab.omnihex.xyz {
  reverse_proxy 127.0.0.1:3000
}
```

Make sure the DNS record for `api.lab.omnihex.xyz` points to the VPS before expecting HTTPS to work.

## Test Public HTTPS

```sh
curl https://api.lab.omnihex.xyz/health
```

Expected response:

```json
{
  "ok": true,
  "service": "OmniHex API",
  "time": "2026-05-02T00:00:00.000Z"
}
```

Test the public signals endpoint:

```sh
curl https://api.lab.omnihex.xyz/public/signals
```

Test the public status endpoint:

```sh
curl https://api.lab.omnihex.xyz/public/status
```

## Future Notes

- Keep front-end and backend decoupled.
- Use environment variables for future service URLs and secrets.
- Do not hardcode server IP addresses in front-end code.
- Keep `lab.omnihex.xyz` on Cloudflare Pages.
- Put future dynamic services behind project-scoped subdomains such as `api.lab.omnihex.xyz` and `admin.lab.omnihex.xyz`.
