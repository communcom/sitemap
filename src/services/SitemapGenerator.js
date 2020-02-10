const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const { Logger } = core.utils;

const env = require('../data/env');
const {
    createCommonSitemap,
    createIndexSitemap,
    createSitemap,
    postToSitemapXml,
} = require('../utils/sitemap');
const { wait } = require('../utils/common');
const commonList = require('../data/commonList');

const PostModel = require('../models/Post');
const SitemapModel = require('../models/Sitemap');

const CHUNK_SIZE = 1000;

class SitemapGenerator extends BasicService {
    start() {
        this._proccess();
    }

    async _proccess() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await this._generateBulk();
            } catch (err) {
                Logger.error('SitemapGenerator tick failed:', err);
            }

            await wait(env.GLS_GENERATE_EVERY);
        }
    }

    async _generateBulk() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const partsUpdated = await this._generate();

            if (partsUpdated < CHUNK_SIZE) {
                break;
            }
        }

        await this._generateCommonSitemap();
        await this._writeIndexSitemap();
    }

    async _generate() {
        const generateStartTime = new Date();

        const partsObjects = await SitemapModel.find(
            { needRegenerate: true },
            { _id: false, part: true },
            { lean: true, limit: CHUNK_SIZE, sort: { part: -1 } }
        );

        const parts = partsObjects.map(({ part }) => part);

        for (const part of parts) {
            try {
                await this._generateForPart(part);
            } catch (err) {
                Logger.error(`Can't create sitemap for part: (${part}):`, err);
            }
        }

        await SitemapModel.updateMany(
            {
                $and: [
                    {
                        part: {
                            $in: parts,
                        },
                    },
                    {
                        needRegenerateAt: {
                            $lte: generateStartTime,
                        },
                    },
                ],
            },
            {
                $set: {
                    needRegenerate: false,
                    needRegenerateAt: null,
                },
            }
        );

        return partsObjects.length;
    }

    async _generateForPart(part) {
        const posts = await PostModel.aggregate([
            {
                $match: { sitemap: part },
            },
            {
                $project: {
                    sitemap: true,
                    contentId: true,
                    author: true,
                    community: true,
                    creationTime: true,
                    updateTime: true,
                },
            },
        ]);

        const xmlLines = posts.map(postToSitemapXml);

        await createSitemap(xmlLines, part);
    }

    async _writeIndexSitemap() {
        return new Promise((resolve, reject) => {
            const cursor = SitemapModel.find(
                {},
                { _id: false, part: true, updateTime: true },
                { lean: true, sort: { updateTime: -1 } }
            ).cursor();

            const list = [
                {
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}/sitemap_common.xml`,
                    },
                    lastmod: {
                        '#text': formatDate(new Date()),
                    },
                },
            ];

            cursor.on('data', ({ part, updateTime }) => {
                list.push({
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}/sitemap_${part}.xml`,
                    },
                    lastmod: {
                        '#text': formatDate(updateTime),
                    },
                });
            });

            cursor.on('close', async () => {
                try {
                    await createIndexSitemap(list);

                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    async _generateCommonSitemap() {
        await createCommonSitemap(commonList);
    }
}

function formatDate(date) {
    return date.toJSON().substr(0, 19) + '+00:00';
}

module.exports = SitemapGenerator;
