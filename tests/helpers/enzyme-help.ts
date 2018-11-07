
/* Some helper functions when writing unit tests for react comps using enzyme.
 * */

import {expect} from 'chai';

/* Simulates change on component. Returns the found component. */
export function simulateChange(wrapper, id, value) {
    const comp = wrapper.find(id);
    comp.simulate('change', {target: {value: value}});
    return comp;
}

export function verifyChange(comp, from, to) {
    expect(comp.props().value).to.equal(from);
    comp.simulate('change', {target: {value: to}});
    expect(comp.props().value).to.equal(to);
}

