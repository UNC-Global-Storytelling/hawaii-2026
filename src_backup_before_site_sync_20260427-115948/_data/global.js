import directus, { directusConfigured } from './directus.js';
import { readSingleton } from '@directus/sdk';

export default async () => {
    if (!directusConfigured || directus.__notConfigured) {
        console.warn('⚠️  Directus global singleton skipped: client not configured.');
        return {};
    }

    try {
        return await directus.request(readSingleton('global'));
    } catch (error) {
        console.error('❌ Failed to load Directus global singleton:', error.message);
        return {};
    }
}
