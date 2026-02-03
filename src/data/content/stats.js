const content = require('../../../data/astrolumen_content_v1.json');

const stats = content.stats;
const { getContent } = require('./content-store');

const stats = getContent().stats || {};

module.exports = {
  stats
};
