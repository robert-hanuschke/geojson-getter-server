# geojson-getter-server

A lightweight HTTP server that exposes [geojson-getter](https://github.com/robert-hanuschke/geojson-getter) as a REST API. Resolves GeoJSON for OpenStreetMap relations via OSM relation ID or Wikidata ID.

## Endpoints

### `GET /geojson/from-osm-relation/:osmId`

Returns GeoJSON for the given OSM relation ID.

```
GET /geojson/from-osm-relation/62484
```

### `GET /geojson/from-wikidata/:wikidataId`

Resolves an OSM relation ID from the given Wikidata ID, then returns its GeoJSON.

```
GET /geojson/from-wikidata/Q64
```

### Error responses

All endpoints return structured JSON error responses with appropriate HTTP status codes.

| Error                                        | Status |
| -------------------------------------------- | ------ |
| Invalid OSM ID                               | 400    |
| No OSM relation found for Wikidata ID        | 404    |
| Relation has no elements                     | 404    |
| Wikidata unavailable                         | 502    |
| Overpass unavailable (all mirrors exhausted) | 502    |
| GeoJSON conversion failed                    | 500    |

## Fair use

This server queries the [Wikidata REST API](https://www.wikidata.org/wiki/Wikidata:REST_API) and public [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) mirrors on behalf of its callers. Both are free, community-funded services — please use them responsibly:

- **Cache responses** wherever possible. Relation geometry rarely changes; re-fetching on every request is unnecessary load on shared infrastructure.
- **Set a meaningful `OVERPASS_USER_AGENT`** that identifies your application and includes a contact URL. Instance operators use this to reach you if your usage causes issues.
- **Do not use this server for bulk or batch processing** without running your own Overpass instance. Public mirrors are not intended for high-volume automated queries.
- **Respect rate limits.** A 429 response means you are sending too many requests. Back off and retry with delays rather than switching mirrors aggressively.

Each Overpass mirror operates independently and may have its own usage policy — check the terms of the specific mirror you are using. For large-scale usage, consider hosting your own Overpass instance using [overpass-api.de's Docker image](https://github.com/drolbr/docker-overpass) and passing the URL via `OVERPASS_API_URLS`.

Wikidata API usage policy: https://www.wikidata.org/wiki/Wikidata:Data_access  
Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API

## Running

### Requirements

- Node.js 22+
- npm 10+

### Environment variables

| Variable              | Required | Description                                                                                                 |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `OVERPASS_USER_AGENT` | Yes      | Identifies your application to Overpass mirrors. Use the format `appname/version (contact-url)`             |
| `PORT`                | No       | Port to listen on (default: 3000)                                                                           |
| `OVERPASS_API_URLS`   | No       | Comma-separated list of Overpass API mirror URLs. Falls back to the defaults in `geojson-getter` if not set |

The server will exit immediately if any required variable is missing.

### Local

```bash
npm install
OVERPASS_USER_AGENT="myapp/1.0 (https://github.com/myorg/myrepo)" npm start
```

### Docker

Build:

```bash
docker build -t geojson-getter-server .
```

Run:

```bash
docker run \
  -p 3000:3000 \
  -e OVERPASS_USER_AGENT="myapp/1.0 (https://github.com/myorg/myrepo)" \
  geojson-getter-server
```

With custom Overpass mirrors:

```bash
docker run \
  -p 3000:3000 \
  -e OVERPASS_USER_AGENT="myapp/1.0 (https://github.com/myorg/myrepo)" \
  -e OVERPASS_API_URLS="https://overpass-api.de/api/interpreter,https://my-mirror.example.com/api/interpreter" \
  geojson-getter-server
```

With a custom port:

```bash
docker run \
  -p 8080:8080 \
  -e PORT=8080 \
  -e OVERPASS_USER_AGENT="myapp/1.0 (https://github.com/myorg/myrepo)" \
  geojson-getter-server
```

## Development

```bash
npm install
npm run dev
```

### Linting and formatting

```bash
npm run lint
npm run format
```
