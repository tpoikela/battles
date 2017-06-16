
const expect = require('chai').expect;
const RG = require('../../../client/src/battles.js');

describe('Component.Base', function() {

    it('has exactly one related entity', function() {
        const entity = new RG.Entity();
        const entity2 = new RG.Entity();
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

    it('can be copied, cloned, compared', function() {
        const comp = new RG.Component.Base('Base');
        const compClone = comp.clone();
        expect(comp.equals(compClone)).to.be.true;
        expect(compClone.equals(comp)).to.be.true;

        const compCopy = new RG.Component.Base('XXX');
        compCopy.copy(comp);
        expect(comp.equals(compCopy)).to.be.true;

        expect(comp.toString()).to.match(/Base/);

    });

    it('has onAdd/Remove callback mechanism', function() {
        const comp = new RG.Component.Base('Base');
        const entity = new RG.Entity();

        let calledAdd = false;
        const callbackAdd = function() {calledAdd = true;};

        let calledRemove = false;
        const callbackRemove = function() {calledRemove = true;};

        let calledIllegal = false;
        const callbackIllegal = function() {calledIllegal = true;};

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
