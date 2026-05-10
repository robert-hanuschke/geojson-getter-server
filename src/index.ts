import { Context, Hono } from 'hono';
import { serve } from '@hono/node-server';
import { PinoLogger, pinoLogger } from 'hono-pino';
import { logger } from './logger';
import { env } from './env';
import {
  getGeojsonFromWikidataId,
  getGeojsonFromOsmRelationId,
  GeojsonError,
} from 'geojson-getter';

type AppVariables = {
  logger: PinoLogger;
};

type Env = {
  Variables: AppVariables;
};

const app = new Hono<Env>();

app.onError((err, c) => {
  const log = c.get('logger');
  log.error({ err, path: c.req.path, method: c.req.method }, 'Unhandled error');
  return c.json({ error: 'Internal server error' }, 500);
});

app.use(pinoLogger({ pino: logger }));

function getOverpassApiUrls(): string[] | undefined {
  const raw = env.OVERPASS_API_URLS;
  if (!raw) return undefined;
  return raw.split(',').map((url: string) => url.trim());
}

function geojsonErrorToResponse(c: Context<Env>, error: GeojsonError) {
  const log = c.get('logger');
  switch (error.type) {
    case 'invalid_osm_id':
      log.warn({ error }, 'invalid OSM ID');
      return c.json({ error: 'Invalid OSM ID', osmId: error.osmId }, 400);
    case 'no_osm_id_for_wikidata':
      log.warn({ error }, 'no OSM relation for Wikidata ID');
      return c.json(
        { error: 'No OSM relation found', wikidataId: error.wikidataId },
        404
      );
    case 'wikidata_failed':
      log.warn({ error }, 'Wikidata request failed');
      return c.json({ error: 'Wikidata unavailable', detail: error }, 502);
    case 'overpass_failed':
      log.warn({ error }, 'all Overpass mirrors failed');
      return c.json(
        { error: 'Overpass unavailable', attempts: error.attempts },
        502
      );
    case 'geojson_conversion_failed':
      log.error({ error }, 'GeoJSON conversion failed');
      return c.json({ error: 'GeoJSON conversion failed' }, 500);
    case 'no_elements':
      log.warn({ error }, 'relation has no elements');
      return c.json({ error: 'No elements found', osmId: error.osmId }, 404);
  }
}

app.get('/geojson/from-wikidata/:wikidataId', async (c) => {
  const overpassApiUrls = getOverpassApiUrls();
  const result = await getGeojsonFromWikidataId({
    wikidataId: c.req.param('wikidataId'),
    userAgent: env.OVERPASS_USER_AGENT,
    ...(overpassApiUrls && { overpassApiUrls }),
  });
  return result.ok
    ? c.json(result.value)
    : geojsonErrorToResponse(c, result.error);
});

app.get('/geojson/from-osm-relation/:osmId', async (c) => {
  const osmIdNumber = Number(c.req.param('osmId'));
  if (Number.isNaN(osmIdNumber) || osmIdNumber <= 0) {
    return geojsonErrorToResponse(c, {
      type: 'invalid_osm_id',
      osmId: c.req.param('osmId'),
    });
  }
  const overpassApiUrls = getOverpassApiUrls();
  const result = await getGeojsonFromOsmRelationId({
    osmId: osmIdNumber,
    userAgent: env.OVERPASS_USER_AGENT,
    ...(overpassApiUrls && { overpassApiUrls }),
  });
  return result.ok
    ? c.json(result.value)
    : geojsonErrorToResponse(c, result.error);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`Listening on http://localhost:${info.port}`);
});
