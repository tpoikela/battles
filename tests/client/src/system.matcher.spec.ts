
import { expect } from 'chai';

import RG from '../../../client/src/rg';
import {Matcher} from '../../../client/src/system/system.matcher';
import {Entity} from '../../../client/src/entity';
import * as Component from '../../../client/src/component';

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
