const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const { MongoClient } = require('mongodb');

const env = require('../data/env');

class MongoConnect extends BasicService {
    constructor(...args) {
        super(...args);

        this._client = null;
    }

    async start() {
        this._client = await this._initializeClient();
    }

    async _initializeClient() {
        return new Promise((resolve, reject) => {
            const client = new MongoClient(env.GLS_PRISM_MONGO_CONNECT);

            client.connect((err, client) => {
                if (err) {
                    Logger.error('Error while connectiong to prism MongoDB: ', err);
                    reject(err);
                    return;
                }

                Logger.info('Successfully connected to prisma MongoDB');

                resolve(client);
            });
        });
    }

    getClient() {
        return this._client;
    }
}

module.exports = MongoConnect;
