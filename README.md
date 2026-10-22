# Blitz Relay Dashboard

![Overview, rooms, room details, and connections pages in dark and light themes](.github/assets/banner.png)

Blitz Relay Dashboard is a web app for monitoring and managing
[Blitz Relay](https://github.com/abdelfattahradwan/blitz-relay) servers through their HTTP admin API. The dashboard runs
entirely in the browser and has no server component. You build it once and serve the resulting static files from any
web server.

## Features

The dashboard provides the following features:

- **Overview**: shows the relay's health, version, request latency, and room statistics, and updates them live.
- **Rooms**: lists every room on the relay, with search and filters for room type, visibility, host, and clients.
- **Room management**: lets you create persistent rooms, rename rooms, edit room metadata, remove the host of a
  persistent room, and delete rooms.
- **Clients**: lists the clients in a room, with their IP addresses when the relay reveals them, and lets you kick
  them.
- **Connections**: saves several relays under names of your choice, shows each relay's version, and lets you switch
  between them from the navigation bar.
- **Themes**: provides dark and light themes, and can follow the system preference.
- **Connection storage**: encrypts each connection's relay URL and admin token, and stores them only in the browser.

## Requirements

To use the dashboard, you need the following:

- A Blitz Relay server with its HTTP API enabled. Use Blitz Relay 1.4.0 or later to list a room's clients and remove
  hosts. With earlier versions, you kick a client by entering its virtual client ID instead.
- Docker, or a web server that can serve static files and fall back to `index.html` for unknown paths, such as nginx,
  Apache HTTP Server, or Caddy.
- A current version of a major browser. In browsers that don't support customisable select elements, the dashboard
  displays the browser's native select controls.

## Run the dashboard with Docker

The repository includes a `Dockerfile` that builds the dashboard and serves it with
[static-web-server](https://static-web-server.net/). The image contains only the web server and the dashboard's static
files, so you don't need Bun or a separate web server.

To run the dashboard with Docker, follow these steps:

1. Build the image:

   ```sh
   docker build -t blitz-relay-dashboard .
   ```

2. Start a container:

   ```sh
   docker run -d -p 8080:8080 --read-only --cap-drop ALL --name blitz-relay-dashboard blitz-relay-dashboard
   ```

   Alternatively, start it with Docker Compose, which applies the same restrictions:

   ```sh
   docker compose up -d
   ```

3. Open http://localhost:8080 in your browser.

The container behaves as follows:

- It listens on port `8080` and runs as an unprivileged user, so it works with a read-only file system.
- It serves `index.html` for any path that doesn't match a file.
- It sends an `X-Robots-Tag: noindex, nofollow` header with every response.
- It tells browsers to revalidate `index.html` on every visit and to cache the hashed files in `/_app/immutable/` for a
  year, so browsers load a new version of the dashboard as soon as you update the image.
- It answers health checks at `/health`. The image has no shell or `curl`, so probe the endpoint from your orchestrator
  or reverse proxy instead of with a Docker `HEALTHCHECK`.

The container serves the dashboard over HTTP. To serve it over HTTPS, run it behind a reverse proxy.

To build the image for both `linux/amd64` and `linux/arm64`, use Docker Buildx and push the result to your registry:

```sh
docker buildx build --platform linux/amd64,linux/arm64 -t REGISTRY/blitz-relay-dashboard --push .
```

Replace `REGISTRY` with the address of your container registry, for example `ghcr.io/your-name`.

## Deploy the dashboard

Before you begin, install [Bun](https://bun.sh) or another package manager. The commands in this document use Bun, but
Bun isn't required. For more information, see [Use another package manager](#use-another-package-manager).

To deploy the dashboard, follow these steps:

1. Install the dependencies:

   ```sh
   bun install
   ```

2. Build the static site:

   ```sh
   bun run build
   ```

   The build output is written to the `build` directory.

3. Copy the contents of the `build` directory to your web server.
4. Configure your web server to serve `index.html` for any path that doesn't match a file. For example configurations,
   see the following sections.

The dashboard is a single-page app: the browser renders every page from `index.html`. Without the fallback, links such
as `/rooms/ABCD1234` return a `404` error when they're opened directly or reloaded.

The following sections show configurations for nginx, Apache HTTP Server, and Caddy. Each configuration serves the
dashboard at dashboard.example.com from the `/srv/blitz-relay-dashboard` directory. Each configuration also sends an
`X-Robots-Tag` header that tells search engines not to index the dashboard. The dashboard itself includes a `robots.txt`
file that disallows all crawlers, and `noindex` meta tags.

The nginx and Apache HTTP Server configurations serve the dashboard over HTTP. To serve it over HTTPS, add your
certificate configuration. Caddy serves the site over HTTPS automatically.

### nginx

Add the following `server` block to your nginx configuration:

```nginx
server {
    listen 80;
    server_name dashboard.example.com;
    root /srv/blitz-relay-dashboard;

    add_header X-Robots-Tag "noindex, nofollow" always;

    location / {
        try_files $uri /index.html;
    }
}
```

**Note**: A `location` block inherits `add_header` directives from the `server` block only if it doesn't define any
`add_header` directives of its own. If you add a header in `location /`, repeat the `X-Robots-Tag` header there.

### Apache HTTP Server

Enable the `mod_dir` and `mod_headers` modules, and then add the following virtual host to your Apache HTTP Server
configuration:

```apache
<VirtualHost *:80>
    ServerName dashboard.example.com
    DocumentRoot "/srv/blitz-relay-dashboard"

    <Directory "/srv/blitz-relay-dashboard">
        Require all granted
        FallbackResource /index.html
    </Directory>

    Header always set X-Robots-Tag "noindex, nofollow"
</VirtualHost>
```

### Caddy

Add the following site block to your Caddyfile:

```caddyfile
dashboard.example.com {
    root /srv/blitz-relay-dashboard
    encode
    header X-Robots-Tag "noindex, nofollow"
    try_files {path} /index.html
    file_server
}
```

## Connect to a relay

The dashboard sends requests to the relay directly from the browser, so the relay's HTTP API must be reachable from
every device that opens the dashboard.

Before you connect, configure the relay as follows:

- Start the relay without the `--disable-http` flag. By default, the HTTP API listens on port `7771`.
- Set the admin token in the relay's `BLITZ_RELAY_HTTP_ADMIN_TOKEN` environment variable.
- If you restrict the relay's cross-origin resource sharing (CORS) policy with the `--cors` flag, add the dashboard's
  origin to `allowedOrigins`. Also allow the `Authorization` and `Content-Type` headers, and the `GET`, `POST`, `PATCH`,
  and `DELETE` methods. By default, the relay accepts requests from any origin.
- If you serve the dashboard over HTTPS, serve the relay's HTTP API over HTTPS too, for example behind a reverse proxy.
  Browsers block requests from HTTPS pages to HTTP addresses.
- If you want the dashboard to show clients' IP addresses, set the relay's `--client-details` option to `IpAddresses`,
  or to `IpEndpoints` to include ports. By default, the relay only reveals client IDs.

To connect the dashboard to a relay, follow these steps:

1. Open the dashboard. The first time you open it, the **Add a connection** page appears. To add another connection
   later, click **Connections** in the navigation bar, and then click **Add connection**.
2. In the **Name** field, enter a name that identifies the relay, for example `Production`.
3. In the **Relay URL** field, enter the address of the relay's HTTP API, for example `http://localhost:7771`.
4. In the **Admin token** field, enter the value of the relay's `BLITZ_RELAY_HTTP_ADMIN_TOKEN` environment variable.
5. Click **Add connection**.

The dashboard checks that the relay responds, saves the connection, and makes it the active connection.

To switch to another saved connection, click the active connection's name in the navigation bar, and then click the
connection that you want to use. The dashboard opens the overview of the selected relay. On the **Connections** page,
you can also edit and delete saved connections.

## Security

The dashboard encrypts the saved connections with AES-GCM under a non-extractable key, and stores them in the browser's
IndexedDB. Encryption keeps the admin tokens out of plain-text storage, but anyone with access to the browser profile
can still use the dashboard and its tokens. Restrict access to the browser profile and to the web server that hosts the
dashboard.

## Develop the dashboard

Before you begin, install Bun or another package manager.

Install the dependencies and start the development server:

```sh
bun install
bun run dev
```

The following table lists the project's scripts:

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `bun run dev`     | Starts the development server                      |
| `bun run check`   | Type-checks the project with `svelte-check`        |
| `bun run lint`    | Checks formatting with oxfmt and lints with ESLint |
| `bun run format`  | Formats the project with oxfmt                     |
| `bun run build`   | Builds the static site into the `build` directory  |
| `bun run preview` | Serves the production build locally                |

## Use another package manager

The project doesn't depend on Bun. You can install the dependencies and run the scripts with another package manager,
such as npm, pnpm, aube, or Nub:

- [aube](https://aube.sh) and [Nub](https://nubjs.com) read and write the existing `bun.lock` file, so you can use them
  without any changes.
- To use npm or pnpm, delete the `bun.lock` file before you install the dependencies. The package manager creates its
  own lockfile.

To run a script, replace `bun run` with your package manager's equivalent, for example `npm run build`.

## Licence

Blitz Relay Dashboard is released under the MIT License. For more information, see the [`LICENSE`](LICENSE) file.
