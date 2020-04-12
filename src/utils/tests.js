export function makeMock(date, limit) {
    if (!date) {
        date = new Date();
        date.setDate(date.getDate() - 100);
    }

    if (new Date(date).toDateString() === new Date().toDateString()) {
        date = new Date();
        date.setDate(date.getDate() - 100);
    }

    const countDays = Math.round((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));

    const posts = [];
    const countPosts = Math.round(limit / countDays);

    for (let day = 1; day <= countDays; day++) {
        for (let count = 1; count <= countPosts; count++) {
            const postDate = new Date(date);
            postDate.setDate(postDate.getDate() + day);

            posts.push({
                contentId: {
                    communityId: 'ANIMALS',
                    userId: 'tst3eyoszuvq',
                    permlink: Math.random()
                        .toString(36)
                        .substr(2, 9),
                },
                authorUsername: 'gleichner-beatris-md',
                communityAlias: 'animals',
                creationTime: postDate,
                updateTime: postDate,
            });
        }
    }

    return posts;
}
