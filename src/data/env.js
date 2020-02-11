const core = require('cyberway-core-service');
const env = process.env;

module.exports = {
    ...core.data.env,
    GLS_PRISM_MONGO_CONNECT: env.GLS_PRISM_MONGO_CONNECT,
    GLS_PAUSE: Boolean(env.GLS_PAUSE) && env.GLS_PAUSE !== 'false',
    GLS_GENERATE_EVERY: Number(env.GLS_GENERATE_EVERY) || 60 * 60 * 1000,
    GLS_FILL_EVERY: Number(env.GLS_GENERATE_EVERY) || 30000,
    GLS_DESTINATION_FOLDER: env.GLS_DESTINATION_FOLDER || './sitemap',
    GLS_HOSTNAME: env.GLS_HOSTNAME || 'https://commun.com',
    GLS_SITEMAP_SIZE: env.GLS_SITEMAP_SIZE || 40000,
};
