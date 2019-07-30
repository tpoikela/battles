
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import {OWMap} from '../../../client/src/overworld.map';
import {OW} from '../../../client/src/ow-constants';
import {Screen} from '../../../client/gui/screen';
import {ElementMarker} from '../../../client/src/element';

describe('OWMap', () => {
    it('can be created', () => {
        const ow = new OWMap();
        expect(ow.hasTerrMap()).to.equal(false);
    });

    it('can be created with factory function', () => {
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const overworld = OWMap.createOverWorld(conf);
        const map = overworld.getMap();

        expect(map).to.have.length(40);
        expect(map[0]).to.have.length(20);
    });

    it('has biomes and features added', () => {
        const conf = {
            owTilesX: 40 ,
            owTilesY: 20
        };
        const ow = OWMap.createOverWorld(conf);
        expect(ow.getBiome(0, 1)).to.match(/[a-zA-Z_]+/);

        const features = ow.getFeaturesByType(OW.WCAPITAL);
        expect(features).to.have.length(1);

        const xyBT = ow.getFeaturesByType(OW.BTOWER);
        const xyWC = ow.getFeaturesByType(OW.WCAPITAL);
        expect(xyBT).to.have.length.equal(1);
        expect(xyWC).to.have.length.equal(1);
        const path = OWMap.getPath(ow, xyBT[0], xyWC[0]);
        ow.addPathToDebug(path);
        expect(path).to.have.length.above(0);
        const beginPath = ow.getPath(OW.PATH_BEGIN_WCAP);
        ow.addPathToDebug(beginPath);
        expect(beginPath).to.have.length.above(2);
        // console.log(ow.mapToString());
    });

    it('can be constructed as Map.CellList', function() {
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const ow = OWMap.createOverWorld(conf);
        const map = ow.getCellMap();
        // map.debugPrintInASCII();
        map.getCells(c => {
            c._explored = true;
            return true;
        });

        const player = new ElementMarker('@');
        map.getCell(10, 5).removeProps(RG.TYPE_ELEM);
        map.getCell(10, 5).setProp(RG.TYPE_ELEM, player);

        const screen = new Screen(15, 7);
        let render = () => {
            screen.renderAllVisible(5, 5, map);
        };
        expect(render).not.to.throw(Error);
        // screen.printRenderedChars();

        map.getCell(20, 10).removeProps(RG.TYPE_ELEM);
        map.getCell(20, 10).setProp(RG.TYPE_ELEM, player);
        render = () => {
            screen.renderAllVisible(20, 10, map);
        };
        expect(render).not.to.throw(Error);
        // screen.printRenderedChars();
    });
});
