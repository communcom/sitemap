const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const PostModel = require('../../models/Post');
const SitemapModel = require('../../models/Sitemap');
const { extractContentId } = require('../../utils/content');

class Post extends BasicController {
    // TODO: maybe need update instead of remove and another mechanic in sitemap population
    async handleBan({ commun_code: communityId, message_id: messageId }) {
        const contentId = {
            communityId,
            userId: messageId.author,
            permlink: messageId.permlink,
        };

        const removedPost = await PostModel.findOneAndRemove({
            'contentId.communityId': contentId.communityId,
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        await this._updateSitemap(removedPost);
    }

    async handleDelete(content) {
        const contentId = extractContentId(content);

        const removedPost = await PostModel.findOneAndRemove({
            'contentId.communityId': contentId.communityId,
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        await this._updateSitemap(removedPost);
    }

    async _updateSitemap(post) {
        if (post) {
            return;
        }

        await SitemapModel.findOneAndUpdate({
            $inc: { count: -1 },
            $set: {
                updateTime: new Date(),
                needRegenerate: true,
                needRegenerateAt: new Date(),
            },
        });
    }
}

module.exports = Post;
