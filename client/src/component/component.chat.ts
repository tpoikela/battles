/* Chat-based components are defined here. */
import {ChatTrainer} from '../chat';
import {Component} from './component.base';

const UniqueDataComponent = Component.UniqueDataComponent;
/* Data component added to trainer actors. */
export const Trainer = UniqueDataComponent('Trainer', {
    chatObj: null
});

// Hack to prevent serialisation of chatObj
delete Trainer.prototype.setChatObj;

Trainer.prototype._init = function() {
    this.chatObj = new ChatTrainer();

    const _addCb = () => {
      this.chatObj.setTrainer(this.getEntity());
    };
    this.addCallback('onAdd', _addCb);
};

