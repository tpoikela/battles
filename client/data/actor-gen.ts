/* Contains an actor generator. Generates 'object shells' which are then used
 * for the procedural generation. */

const ActorGen = {};

// Mods that can be applied to actors
const mods = {
    size: {
        tiny: [{strength: -2, speed: 15}],
        small: [{strength: -1, speed: 10}],
        normal: [],
        big: [{accuracy: -1, strength: 2}],
        huge: [{accuracy: -2, strength: 4, speed: -10}]
    },

    disposition: {
        friendly: [],
        neutral: [],
        hostile: []
    }

};

const weights = {
    size: {
        tiny: 1,
        small: 2,
        normal: 5,
        big: 2,
        huge: 1
    },

};

/* Given a base shell, generates an array of actor object shells. */
ActorGen.genActors = function(base) {

};

module.exports = ActorGen;
