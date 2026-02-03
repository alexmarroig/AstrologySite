const content = require('../../../data/astrolumen_content_v1.json');

const profile = content.profile;
const { getContent } = require('./content-store');

const profile = getContent().profile || {};

module.exports = {
  profile
};
