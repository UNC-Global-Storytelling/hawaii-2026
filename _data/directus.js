import { createDirectus, rest, staticToken } from '@directus/sdk';

const directus = createDirectus(process.env.DIRECTUS_API_URL)
  .with(staticToken(process.env.DIRECTUS_API_TOKEN))
  .with(rest());

export default directus;
