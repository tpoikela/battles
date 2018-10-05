
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const Matcher = require('../../../client/src/system/system.matcher');
const Entity = require('../../../client/src/entity');
const Component = require('../../../client/src/component');

describe('System.Matcher', () => {
    it('it matches entities/components', () => {
        const notExpr = {not: 'Combat'};
        const ent = new Entity();
        ent.add(new Component.Combat());
        const matcher = new Matcher(notExpr);
        expect(matcher.match(ent)).to.equal(false);

        const ent2 = new Entity();
        expect(matcher.match(ent2)).to.equal(true);
    });
});
