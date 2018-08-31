/* This file contains the setup to generate territory map for clans/races,
 * that is used in choosing actor types for settlements, and also for
 * world event simulations.
 */

const RG = require('../src/rg');
const Territory = require('../src/territory');
const OW = require('../src/overworld.map');

const RNG = RG.Random.getRNG();

const TerritoryMap = function() {

};

/**
 * @param {OW.Map} ow - map of the overworld
 * @param {string} playerRace - Race of the player character
 * @param {array[]} playerXY - Tile x,y coordinates for player
 * @return {Territory} - Generated territory map
 */
TerritoryMap.create = function(ow, playerRace, playerXY) {
    const [playerX, playerY] = playerXY;
    const capXY = ow.getFeaturesByType(OW.WCAPITAL)[0];
    const dwarves = ow.getFeaturesByType(OW.WTOWER)[0];
    const btower = ow.getFeaturesByType(OW.BTOWER)[0];
    const bcapital = ow.getFeaturesByType(OW.BCAPITAL)[0];

    const owMap = ow.getOWMap();
    const terrConf = {
        startSize: 2, // Each starts with 3x3 region
        maxNumPos: 2 // Each has at least 2 starting positions
        // maxFillRatio: 0.7
    };
    const terrMap = new Territory(ow.getSizeX(), ow.getSizeY(), terrConf);

    // Anything not here will be treated as FULL cell in owMap, and thus
    // cannot be occupied by race/clan
    terrMap.useMap(owMap, {
        [OW.TERM]: true,
        [OW.MOUNTAIN]: true,
        [OW.BVILLAGE]: true,
        [OW.WVILLAGE]: true,
        [OW.WCAPITAL]: true,
        [OW.BCAPITAL]: true,
        [OW.WTOWER]: true,
        [OW.BTOWER]: true
    });

    const bears = {name: 'bearfolk', char: 'B'};
    const undeads = {name: 'undead', char: 'u', numPos: 3,
        startX: [ow.getCenterX()], startY: [ow.getSizeY() - 5]};

    terrMap.addRival({name: 'avian', char: 'A'});
    terrMap.addRival(undeads);
    terrMap.addRival({name: 'wildling', char: 'I'});
    terrMap.addRival(bears);
    terrMap.addRival({name: 'wolfclan', char: 'w'});
    terrMap.addRival({name: 'catfolk', char: 'c'});
    terrMap.addRival({name: 'dogfolk', char: 'd'});
    terrMap.addRival({name: 'human', char: '@'});
    terrMap.addRival({name: 'goblin', char: 'g', numPos: 8});
    terrMap.addRival({name: 'dwarf', char: 'D',
        startX: dwarves[0], startY: dwarves[1]});
    terrMap.addRival({name: 'hyrkhian', char: 'y',
        startX: capXY[0], startY: capXY[1]});

    const winterConf = {name: 'winterbeing', char: 'W',
        startX: [btower[0], bcapital[0]],
        startY: [btower[1], bcapital[1]]
    };
    terrMap.addRival(winterConf);

    const coordMap = new RG.OverWorld.CoordMap();
    coordMap.xMap = 10;
    coordMap.yMap = 10;
    const bbox = coordMap.getOWTileBboxFromAreaTileXY(playerX, playerY);
    console.log('Player bbox will be', bbox, 'race', playerRace);

    const pData = terrMap.getData(playerRace);
    pData.numPos += 1;

    const playerOwX = RNG.getUniformInt(bbox.ulx, bbox.lrx);
    const playerOwY = RNG.getUniformInt(bbox.uly, bbox.lry);
    console.log('player OW x,y', playerOwX, playerOwY);
    pData.startX.push(playerOwX);
    pData.startY.push(playerOwY);

    terrMap.generate();
    // console.log(terrMap.mapToString());
    return terrMap;

};

module.exports = TerritoryMap;
