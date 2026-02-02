const { getContent } = require('./content-store');

const services = getContent().services || [];

const findServiceBySlug = (slug) => services.find((service) => service.slug === slug);

module.exports = {
  services,
  findServiceBySlug
};
