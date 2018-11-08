
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {Conf} from '../../../client/src/verify';


describe('Verify', () => {

    it('can verify requirements', () => {
        const conf = new Conf('Test module');

        expect(conf.verifyReq({aaa: 'bbb'}, 'aaa')).to.be.true;
    });

    it('can verify inputs args', () => {
        const conf = new Conf('Test module');

        let func = conf.verifyConf.bind(conf, 'TestFunc', {aaa: 'aaa'}, ['aaa']);
        expect(func).to.not.throw(Error);

        func = conf.verifyConf.bind(conf, 'TestFunc', {bbb: 'aaa'}, ['aaa']);
        expect(func).to.throw(Error);
    });

});
