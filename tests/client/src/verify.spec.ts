
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import * as Verify from '../../../client/src/verify';


describe('Verify', () => {

    it('can verify requirements', () => {
        const conf = new Verify.Conf('Test module');

        expect(conf.verifyReq({aaa: 'bbb'}, 'aaa')).to.be.true;
    });

    it('can verify inputs args', () => {
        const conf = new Verify.Conf('Test module');

        let func = conf.verifyConf.bind(conf, 'TestFunc', {aaa: 'aaa'}, ['aaa']);
        expect(func).to.not.throw(Error);

        func = conf.verifyConf.bind(conf, 'TestFunc', {bbb: 'aaa'}, ['aaa']);
        expect(func).to.throw(Error);
    });

    it('can verify reqs with |', function() {
        const conf = new Verify.Conf('Verif split');
        let ok = conf.verifyReq({a: 1, b: 2, ccc: 3}, 'zzz|bbb|ccc');
        expect(ok).to.equal(true);
        
        ok = conf.verifyReq({a: 1, b: 2, xxx: 3}, 'zzz|bbb|ccc');
        expect(ok).to.not.equal(true);
    });
    

});
