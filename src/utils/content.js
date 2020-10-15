function extractContentId(content) {
    const { author, permlink } = content.message_id;

    return {
        communityId: content.commun_code,
        userId: author,
        permlink,
    };
}
module.exports = {
    extractContentId,
};
