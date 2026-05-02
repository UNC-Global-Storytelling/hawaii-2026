import { createDirectus, rest, staticToken } from '@directus/sdk';

const apiUrl = process.env.DIRECTUS_API_URL;
const apiToken = process.env.DIRECTUS_API_TOKEN;

if (!apiUrl) {
  console.warn('⚠️  Skipping Directus client setup: DIRECTUS_API_URL missing in environment.');
}

let directus;

if (!apiUrl) {
  directus = {
    __notConfigured: true,
    request: async () => ({ data: null })
  };
} else {
  let client = createDirectus(apiUrl);

  if (apiToken) {
    client = client.with(staticToken(apiToken));
  } else {
    console.warn('ℹ️  DIRECTUS_API_TOKEN not set; falling back to public access permissions.');
  }

  directus = client.with(rest());
}

export const directusConfigured = Boolean(apiUrl);
export const directusAuthenticated = Boolean(apiUrl && apiToken);
export const directusUrl = apiUrl;

export default directus;
