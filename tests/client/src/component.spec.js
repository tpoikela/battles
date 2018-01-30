
const expect = require('chai').expect;
const RG = require('../../../client/src/battles.js');

import Entity from '../../../client/src/entity';

describe('Component.Base', () => {

    it('has exactly one related entity', () => {
        const entity = new Entity();
        const entity2 = new Entity();
        const comp = new RG.Component.Base('Base');

        expect(comp.getType()).to.equal('Base');

        comp.setEntity(entity);
        expect(comp.getEntity().getID()).to.equal(entity.getID());

        // Try to override the entity
        RG.suppressErrorMessages = true;
        comp.setEntity(entity2);
        expect(comp.getEntity().getID()).to.equal(entity.getID());
        RG.suppressErrorMessages = false;

        comp.setEntity(null);
        expect(comp.getEntity()).to.be.null;
    });

    it('can be copied, cloned, compared', () => {
        const comp = new RG.Component.Base('Base');
        const compClone = comp.clone();
        expect(comp.equals(compClone)).to.be.true;
        expect(compClone.equals(comp)).to.be.true;

        const compCopy = new RG.Component.Base('XXX');
        compCopy.copy(comp);
        expect(comp.equals(compCopy)).to.be.true;
        expect(comp.toString()).to.match(/Base/);
    });

    it('has onAdd/Remove callback mechanism', () => {
        const comp = new RG.Component.Base('Base');
        const entity = new Entity();

        let calledAdd = false;
        const callbackAdd = () => {calledAdd = true;};

        let calledRemove = false;
        const callbackRemove = () => {calledRemove = true;};

        let calledIllegal = false;
        const callbackIllegal = () => {calledIllegal = true;};

        comp.addCallback('onAdd', callbackAdd);
        comp.addCallback('onRemove', callbackRemove);
        RG.suppressErrorMessages = true;
        comp.addCallback('onIllegal', callbackIllegal);
        RG.suppressErrorMessages = false;

        expect(calledIllegal).to.be.false;

        expect(calledAdd).to.be.false;
        entity.add('Base', comp);
        expect(calledAdd).to.be.true;

        expect(calledRemove).to.be.false;
        entity.remove('Base');
        expect(calledRemove).to.be.true;
        expect(calledIllegal).to.be.false;
    });
});

describe('Component.Poison', () => {
    it('can be copied or cloned', () => {
        const p1 = new RG.Component.Poison();
        p1.setProb(0.01);
        p1.setDamageDie('1d6 + 4');
        p1.setDurationDie('3d5 + 15');
        const p2 = p1.clone();

        expect(p2.getProb()).to.equal(0.01);

        const d1Str = p1.getDamageDie().toString();
        const d2Str = p2.getDamageDie().toString();
        expect(d1Str).to.equal(d2Str);
    });
});

describe('Component.Combat', () => {
    it('contains damage dies for damage dealing', () => {
        const player = RG.FACT.createPlayer('Player', {});
        const combatComp = new RG.Component.Combat();
        player.add('Combat', combatComp);
        expect(player.get('Combat').rollDamage() >= 1).to.equal(true);
        expect(player.get('Combat').rollDamage() <= 4).to.equal(true);
    });
});
