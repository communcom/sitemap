const env = require('../data/env');

function getLateDate() {
    const lateDate = new Date();
    lateDate.setDate(lateDate.getDate() - env.GLS_LATE_DAYS_COUNT);

    return lateDate;
}

function formatDate(date) {
    return date.toJSON().substr(0, 19) + '+00:00';
}

module.exports = {
    getLateDate,
    formatDate,
};
