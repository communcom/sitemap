const env = process.env;

module.exports = {
    GLS_PRISM_MONGO_CONNECT: env.GLS_PRISM_MONGO_CONNECT,
    GLS_GENERATE_EVERY: Number(env.GLS_GENERATE_EVERY) || 10 * 1000,
    GLS_FILL_EVERY: Number(env.GLS_GENERATE_EVERY) || 5000,
    GLS_DESTINATION_FOLDER: env.GLS_DESTINATION_FOLDER || './sitemap',
    GLS_HOSTNAME: env.GLS_HOSTNAME || 'https://commun.com',
    GLS_SITEMAP_SIZE: env.GLS_SITEMAP_SIZE || 40000,
};
