
import { expect } from 'chai';

const {CaveGenerator} = require('../../../client/src/cave-generator');

describe('CaveGenerator', () => {
    it('can create Cave-like levels', () => {
        const caveGen = new CaveGenerator();
        const level = caveGen.create(80, 50, {dungeonType: 'Cave'});
        expect(level).to.exist;
    });

    it('can create Lair-like levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const level = caveGen.create(100, 50,
                {dungeonType: 'Lair', isCollapsed: true});
            expect(level).to.exist;

            const extras = level.getExtras();
            expect(extras).to.have.property('startPoint');
            expect(extras).to.have.property('endPoint');
        }
    });

    it('can create Cavern-like levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const level = caveGen.create(150, 80,
                {dungeonType: 'Cavern', isCollapsed: false});
            expect(level).to.exist;

            const extras = level.getExtras();
            expect(extras).to.have.property('startPoint');
            expect(extras).to.have.property('endPoint');
        }
    });
});
