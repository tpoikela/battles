/* Include file for game objects like actors, items and elements. */

const Items = require('./items');
const Actors = require('./actors');
const Elements = require('./elements');

const RGObjects = {
    actors: Actors,
    items: Items,
    elements: Elements
};

module.exports = RGObjects;
