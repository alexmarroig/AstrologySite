const content = require('../../../data/astrolumen_content_v1.json');

const faq = content.faq;
const { getContent } = require('./content-store');

const faq = getContent().faq || [];

module.exports = {
  faq
};
