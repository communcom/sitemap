const env = require('../data/env');

function getLateDate() {
    const lateDate = new Date();
    lateDate.setDate(lateDate.getDate() - env.GLS_LATE_DAYS_COUNT);

    return lateDate;
}

module.exports = {
    getLateDate,
};
