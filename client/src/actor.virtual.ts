
import {BaseActor} from './actor';
import {BrainVirtual} from './brain/brain.virtual';

/* Virtual actor can be used to spawn more entities or for AI-like effects
 * inside a level. */
export class VirtualActor extends BaseActor {

    constructor(name) { // {{{2
        super(name);
        this._brain = new BrainVirtual(this);
    }
}
