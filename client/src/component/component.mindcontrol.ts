
import RG from '../rg';
import {ComponentBase, Component} from './component.base';
import {BrainMindControl} from '../brain';

/* MindControl component allows another actor to control the mind-controlled
 * actor. */
export const MindControl = function() {
    ComponentBase.call(this, 'MindControl');

    let _src = null;
    let _brainTarget = null;
    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    const _addCb = () => {
        const ent = this.getEntity();
        _brainTarget = ent.getBrain();
        if (this.getSource().isPlayer()) {
            ent.setPlayerCtrl(true);
        }
        else {
            ent.setBrain(new BrainMindControl(ent));
        }
    };

    const _removeCb = () => {
        if (this.getSource().isPlayer()) {
            this.getEntity().setPlayerCtrl(false);
        }
        this.getEntity().setBrain(_brainTarget);
    };

    this.addCallback('onAdd', _addCb);
    this.addCallback('onRemove', _removeCb);

};
RG.extend2(MindControl, ComponentBase);

MindControl.prototype.toJSON = function() {
    const obj = ComponentBase.prototype.toJSON.call(this);
    if (RG.isActorActive(this.getSource())) {
        obj.setSource = RG.getObjRef('entity', this.getSource());
    }
    return obj;
};

