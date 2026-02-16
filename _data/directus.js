import { createDirectus, rest } from '@directus/sdk';

const directus = createDirectus('https://directus-brookenf.apps.cloudapps.unc.edu/').with(rest());

export default directus;
