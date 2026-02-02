const { getContent } = require('./content-store');

const faq = getContent().faq || [];

module.exports = {
  faq
};
