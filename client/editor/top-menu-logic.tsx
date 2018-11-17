
import React, {Component} from 'react';
import Modal from 'react-modal';
import {Level} from '../src/level';
import {Battle} from '../src/game.battle';

import dbg = require('debug');
const debug = dbg('bitn:TopMenuLogic');

import {FactoryBattle} from '../src/factory.battle';

interface ITopMenuLogicProps {
  addLevel: (Level) => void;
  level: Level;
  onRef: any;
}


interface ITopMenuLogicState {
    showModal: boolean;
    options: {[key: string]: any};
    cmdOptionsText: string;
    errorMsg: string;
    currentCmd: string;
}

interface FuncObj {
    showModal: boolean;
    func: (any) => void;
}

/* This component handles any menu access and shows the required modal for
 * selecting the options. */
export default class TopMenuLogic extends Component {

    public props: ITopMenuLogicProps;
    public state: ITopMenuLogicState;
    public battles: Battle[];
    public functions: {[key: string]: FuncObj};

    constructor(props: ITopMenuLogicProps) {
      super(props);
      this.state = {
        showModal: false,
        options: {},
        cmdOptionsText: '',
        errorMsg: '',
        currentCmd: ''
      };

      this.battles = [];

      this.onClickModalOK = this.onClickModalOK.bind(this);
      this.onClickModalCancel = this.onClickModalCancel.bind(this);
      this.newBattle = this.newBattle.bind(this);
      this.onChangeCmdOptions = this.onChangeCmdOptions.bind(this);

      this.functions = {
        'level-new-battle': {showModal: true, func: this.newBattle}
      };
    }

    public componentDidMount() {
      this.props.onRef(this);
    }

    public componentWillUnmount() {
      this.props.onRef(null);
    }

    public onClickModalCancel() {
      this.setState({showModal: false, errorMsg: ''});
    }

    public onClickModalOK() {
      try {
        const options = JSON.parse(this.state.cmdOptionsText);
        const funcToCall = this.functions[this.state.currentCmd].func;

        if (typeof funcToCall === 'function') {
          funcToCall(options);
        }
        else {
          throw new Error('Internal error occurred.');
        }
        console.log(options);
        this.setState({showModal: false, errorMsg: ''});
      }
      catch (e) {
        console.error(e);
        this.setState({errorMsg: e.message});
      }
    }

    public onChangeCmdOptions(evt) {
      this.setState({cmdOptionsText: evt.target.value});
    }

    public menuCallback(eventKey) {
      const showModal = this.needsModal(eventKey);
      // TODO get default options for that command
      const options = {name: eventKey};
      const optionsStr = JSON.stringify(options);
      this.setState({
        showModal, cmdOptionsText: optionsStr,
        currentCmd: eventKey
      });
    }

    /* Top menu logic renders only optionally the modal used to modify the
     * settings for each command. */
    public render() {
      let errorMsg = null;
      if (this.state.errorMsg !== '') {
        errorMsg = (<span className='text-danger'>
          {this.state.errorMsg}</span>
        );
      }
      return (
        <Modal
          ariaHideApp={false}
          isOpen={this.state.showModal}
        >
          <p>Please set the options:</p>
          <textarea
            name='menu-cmd-options'
            onChange={this.onChangeCmdOptions}
            rows={10}
            value={this.state.cmdOptionsText}
          />
          <div className='modal-footer row'>
            {errorMsg}
            <button
              className='btn btn-danger'
              onClick={this.onClickCancel}
            >Cancel</button>
            <button
              className='btn btn-success'
              onClick={this.onClickModalOK}
            >OK</button>
          </div>
        </Modal>
      );
    }

    /* Returns true if the given menu command requires modal. */
    public needsModal(eventKey) {
      if (this.functions.hasOwnProperty(eventKey)) {
        const options = this.functions[eventKey];
        if (options.showModal) {
          debug('TopMenuLogic needsModal true');
          return true;
        }
      }
      debug('TopMenuLogic needsModal false');
      return false;
    }

    /* Creates a new battle using current level. */
    public newBattle(conf) {
      debug('TopMenuLogic newBattle() begin');
      // const level = this.props.level;
      const fact = new FactoryBattle();
      const battle = fact.createBattle(null, conf);
      const level = battle.getLevel();
      this.battles.push(battle);
      this.props.addLevel(level);
      debug('TopMenuLogic newBattle() end');
    }

}
