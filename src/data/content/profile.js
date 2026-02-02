const { getContent } = require('./content-store');

const profile = getContent().profile || {};

module.exports = {
  profile
};
