const { getContent } = require('./content-store');

const stats = getContent().stats || {};

module.exports = {
  stats
};
