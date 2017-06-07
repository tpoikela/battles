
var expect = require('chai').expect;
var RG = require('../client/src/battles.js');

describe('Component.Base', function() {

    it('has exactly one related entity', function() {
        var entity = new RG.Entity();
        var entity2 = new RG.Entity();
        var comp = new RG.Component.Base('Base');

        expect(comp.getType()).to.equal('Base');

        comp.setEntity(entity);
        expect(comp.getEntity().getID()).to.equal(entity.getID());

        // Try to override the entity
        comp.setEntity(entity2);
        expect(comp.getEntity().getID()).to.equal(entity.getID());

        comp.setEntity(null);
        expect(comp.getEntity()).to.be.null;

    });

    it('can be copied, cloned, compared', function() {
        var comp = new RG.Component.Base('Base');

        var compClone = comp.clone();
        expect(comp.equals(compClone)).to.be.true;
        expect(compClone.equals(comp)).to.be.true;

        var compCopy = new RG.Component.Base('XXX');
        compCopy.copy(comp);
        expect(comp.equals(compCopy)).to.be.true;

        expect(comp.toString()).to.match(/Base/);

    });

    it('has onAdd/Remove callback mechanism', function() {
        var comp = new RG.Component.Base('Base');
        var entity = new RG.Entity();

        var calledAdd = false;
        var callbackAdd = function() {calledAdd = true;};

        var calledRemove = false;
        var callbackRemove = function() {calledRemove = true;};

        comp.addCallback('onAdd', callbackAdd);
        comp.addCallback('onRemove', callbackRemove);
        comp.addCallback('onIllegal', callbackRemove);

        expect(calledAdd).to.be.false;
        entity.add('Base', comp);
        expect(calledAdd).to.be.true;

        expect(calledRemove).to.be.false;
        entity.remove('Base');
        expect(calledRemove).to.be.true;

    });
});
