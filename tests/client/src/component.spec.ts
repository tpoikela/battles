
import {expect} from 'chai';
import {Entity} from '../../../client/src/entity';
import * as Component from '../../../client/src/component';
import {TagComponent, DataComponent, NO_SERIALISATION
} from '../../../client/src/component/component.base';
import {SentientActor} from '../../../client/src/actor';
import {FactoryActor} from '../../../client/src/factory.actors';

const ComponentBase = Component.ComponentBase;
const CompDefs = Component.Component;

describe('Component', () => {
    it('has functions to define/undefine components', () => {
        const Triple = Component.defineComponent('TripleStrike', {power: 3});
        const tripleComp = new Triple();
        expect(tripleComp.getPower()).to.equal(3);
        expect(CompDefs).to.have.property('TripleStrike');

        Component.undefineComponent('TripleStrike');
        expect(CompDefs).to.not.have.property('TripleStrike');
    });

    it('has function to create components', () => {
        const compArgs = [
            {setStrength: 19},
            {setter: 'setMagic', value: 11}
        ];
        const statsComp = Component.createFromObj('Stats', compArgs);
        expect(statsComp.getStrength()).to.equal(19);
        expect(statsComp.getMagic()).to.equal(11);
    });
});

describe('ComponentBase', () => {

    it('has exactly one related entity', () => {
        const entity = new Entity();
        const entity2 = new Entity();
        const comp = new ComponentBase('Base');

        expect(comp.getType()).to.equal('Base');

        comp.setEntity(entity);
        expect(comp.getEntity().getID()).to.equal(entity.getID());

        // Try to override the entity
        const funcThatThrows = () => {
            comp.setEntity(entity2);
        };
        expect(funcThatThrows).to.throw(Error);
        expect(comp.getEntity().getID()).to.equal(entity.getID());

        comp.setEntity(null);
        expect(comp.getEntity()).to.equal(null);
    });

    it('can be copied, cloned, compared', () => {
        const comp = new ComponentBase('Base');
        const compClone = comp.clone();
        expect(comp.equals(compClone)).to.equal(true);
        expect(compClone.equals(comp)).to.equal(true);

        const compCopy = new ComponentBase('XXX');
        compCopy.copy(comp);
        expect(comp.equals(compCopy)).to.equal(true);
        expect(comp.toString()).to.match(/Base/);
    });

    it('can add a description for component', () => {
        const descr = 'You are extremely fiery';
        const FieryComp = DataComponent('FieryComp',
            {level: 0}, // Data members
            {description: descr} // Static members
        );

        const comp = new FieryComp();
        expect(comp.getLevel()).to.equal(0);
        expect((FieryComp as any).description).to.equal(descr);
    });

    it('has onAdd/Remove callback mechanism', () => {
        const comp = new ComponentBase('Base');
        const entity = new Entity();

        let calledAdd = false;
        const callbackAdd = () => {calledAdd = true;};

        let calledRemove = false;
        const callbackRemove = () => {calledRemove = true;};

        let calledIllegal = false;
        const callbackIllegal = () => {calledIllegal = true;};

        comp.addCallback('onAdd', callbackAdd);
        comp.addCallback('onRemove', callbackRemove);

        const funcThatThrows = () => {
            comp.addCallback('onIllegal', callbackIllegal);
        };
        expect(funcThatThrows).to.throw(Error);

        expect(calledIllegal).to.equal(false);

        expect(calledAdd).to.equal(false);
        entity.add(comp);
        expect(calledAdd).to.equal(true);
        expect(calledIllegal).to.equal(false);
        expect(entity.has('Base')).to.equal(true);

        const baseComp = entity.get('Base');
        expect(baseComp.getType()).to.equal('Base');
        expect(calledRemove).to.equal(false);
        entity.remove('Base');
        expect(calledRemove).to.equal(true);
        expect(calledIllegal).to.equal(false);
    });
});

describe('TagComponent', () => {

    it('is used to create comp declarations with no data fields', () => {
        const conf = {_privateField: true, falseField: false,
            description: 'Test'};
        const UndeadNew = TagComponent('UndeadNew', conf);
        expect((UndeadNew as any).description).to.equal('Test');
        const undeadComp = new UndeadNew();
        expect(undeadComp.getType()).to.equal('UndeadNew');
        expect(undeadComp).to.have.property('_privateField');
        expect(undeadComp.falseField).to.equal(false);

        expect(undeadComp.toJSON).to.be.a('function');
        expect(undeadComp.getType).to.be.a('function');
        expect(undeadComp.getID).to.be.a('function');
        expect(undeadComp.getEntity).to.be.a('function');
    });

    it('can be used for non-serialisable components as well', () => {
        const FastFlight = TagComponent('FastFlight',
            {toJSON: NO_SERIALISATION});
        const flight = new FastFlight();
        expect(flight.toJSON).to.equal(NO_SERIALISATION);
    });

});

describe('RG.DataComponent', () => {

    it('is used to create new data component declarations', () => {
        const Immunity = DataComponent('Immunity',
            {ratio: 0, dmgType: ''});

        const immunComp = new Immunity();
        expect(immunComp.getType()).to.equal('Immunity');
        expect(immunComp.getRatio()).to.equal(0);

        immunComp.setDmgType('Fire');
        expect(immunComp.getDmgType()).to.equal('Fire');

        const immunComp2 = new Immunity({ratio: 2}, [], {}, {xxx: 'yyy'});
        expect(immunComp2.getRatio()).to.equal(2);
        const immunComp3 = new Immunity({dmgType: 'Ice'});
        expect(immunComp3.getDmgType()).to.equal('Ice');
    });

    it('cannot overwrite Component.Base methods', () => {
        /* eslint-disable */
        let Immunity = null;
        const createFunc = () => {
            Immunity = DataComponent('Immunity', ['type']);
        };
        /* eslint-enable */
        expect(createFunc).to.throw(Error);
    });

    it('can have a custom init function', () => {
        const MonsterComp = DataComponent('Monster',
            {monstType: '', monstSize: 0});
        MonsterComp.prototype._init = function(type, size) {
            this.monstType = type;
            this.monstSize = size;
        };
        const monst = new MonsterComp('Dragon', 'BIG');
        expect(monst.getMonstType()).to.equal('Dragon');
        expect(monst.getMonstSize()).to.equal('BIG');
    });

});

describe('Component.Action', () => {

    it('active status and energy', () => {
        const action = new Component.Action();
        expect(action.getEnergy()).to.equal(0);
        expect(action.getActive()).to.equal(false);

    });

});

describe('Component.Poison', () => {
    it('can be copied or cloned', () => {
        const p1 = new Component.Poison();
        p1.setProb(0.01);
        p1.setDamageDie('1d6 + 4');
        const p2 = p1.clone();

        expect(p2.getProb()).to.equal(0.01);

        const d1Str = p1.getDamageDie().toString();
        const d2Str = p2.getDamageDie().toString();
        expect(d1Str).to.equal(d2Str);
    });
});

describe('Component.Combat', () => {
    it('contains damage dies for damage dealing', () => {
        const actorFact = new FactoryActor();
        const player = actorFact.createPlayer('Player', {});
        const combatComp = new Component.Combat();
        player.add(combatComp);
        expect(player.get('Combat').rollDamage() >= 1).to.equal(true);
        expect(player.get('Combat').rollDamage() <= 4).to.equal(true);
    });
});

describe('Component.Physical', () => {

    it('stores size and weight of an entity', () => {
        const phyComp = new Component.Physical();
        phyComp.setWeight(20);
        const phyComp2 = new Component.Physical();
        phyComp2.setWeight(10);

        expect(phyComp.getWeight()).to.equal(20);
        expect(phyComp2.getWeight()).to.equal(10);
    });

});

describe('Component.Expiration', () => {
    it('it manages other components inside entity', () => {
        const expComp = new Component.Expiration();
        expComp.addEffect(new Component.StatsMods(), 10);

        const expComp2 = new Component.Expiration();
        expComp2.addEffect(new Component.StatsMods(), 10);

        const duration = expComp.getDuration();
        const duration2 = expComp2.getDuration();
        expect(Object.values(duration)).to.have.length(1);
        expect(Object.values(duration2)).to.have.length(1);

    });
});

describe('Component.AddOnHit', () => {
    it('can be used to add other comps to actors', () => {
        const compHit = new Component.AddOnHit();
        const poisonComp = new Component.Poison();
        poisonComp.setDamageDie('1d6 + 5');
        compHit.setComp(poisonComp);

        const poisonJSON = poisonComp.toJSON();
        const json = compHit.toJSON();
        const expJSON = {createComp: poisonJSON};
        expect(json.setComp).to.deep.equal(expJSON);
    });
});


describe('Component.Quest', () => {
    it('stores info about quests', () => {
        const questGiver = new SentientActor('giver');
        const questComp = new Component.Quest();
        questComp.setGiver(questGiver);

        const json = questComp.toJSON();
        expect(json).to.not.be.empty;
    });
});

describe('Component.Lore', () => {
    it('can be queried for lore information', () => {
        const loreKeeper = new SentientActor('loreKeeper');
        const loreComp = new Component.Lore();
        const metaData = {x: 0, y: 1, name: 'Castle'};
        loreComp.addEntry({topic: 'sideQuest', respMsg: 'Go south', metaData});

        const topics = loreComp.getLoreTopics();
        expect(topics).to.deep.equal(['sideQuest']);

        expect(loreComp.hasTopic('location')).to.equal(false);
        expect(loreComp.hasTopic('sideQuest')).to.equal(true);

        loreComp.addTopic('mainQuest', ['msg1', 'msg2']);
        const entries = loreComp.getKey({topic: 'mainQuest'});
        expect(entries).to.have.length(1);


        loreComp.addTopic('mainQuest', 'msg3');

        const mainMsg = loreComp.getRespMsg('mainQuest');
        expect(mainMsg).to.have.length(3);

    });
});
