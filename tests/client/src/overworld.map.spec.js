
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const OW = require('../../../client/src/overworld.map');
const Screen = require('../../../client/gui/screen');

describe('OW.Map', () => {
    it('can be created', () => {
        const ow = new OW.Map();
        expect(ow).to.exist;
    });

    it('can be created with factory function', () => {
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const overworld = OW.createOverWorld(conf);
        const map = overworld.getMap();

        expect(map).to.have.length(40);
        expect(map[0]).to.have.length(20);
    });

    it('has biomes and features added', () => {
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const ow = OW.createOverWorld(conf);
        expect(ow.getBiome(0, 1)).to.not.be.empty;

        const features = ow.getFeaturesByType(OW.WCAPITAL);
        expect(features).to.have.length(1);
    });

    it('can be constructed as Map.CellList', function() {
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const ow = OW.createOverWorld(conf);
        const map = ow.getCellList();
        map.debugPrintInASCII();
        map.getCells(c => {
            c._explored = true;
        });

        const player = new RG.Element.Marker('@');
        map.getCell(10, 5).removeProps(RG.TYPE_ELEM);
        map.getCell(10, 5).setProp(RG.TYPE_ELEM, player);

        const screen = new Screen(15, 7);
        screen.renderAllVisible(5, 5, map);
        screen.printRenderedChars();

        map.getCell(20, 10).removeProps(RG.TYPE_ELEM);
        map.getCell(20, 10).setProp(RG.TYPE_ELEM, player);
        screen.renderAllVisible(20, 10, map);
        screen.printRenderedChars();
    });
});
