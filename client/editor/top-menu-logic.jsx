
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-modal';

const debug = require('debug')('bitn:TopMenuLogic');

const RG = require('../src/rg');
const FactoryBattle = require('../src/factory.battle');

/* This component handles any menu access and shows the required modal for
 * selecting the options. */
export default class TopMenuLogic extends Component {

    constructor(props) {
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

    componentDidMount() {
      this.props.onRef(this);
    }

    componentWillUnmount() {
      this.props.onRef(null);
    }

    onClickModalCancel() {
      this.setState({showModal: false, errorMsg: ''});
    }

    onClickModalOK() {
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

    onChangeCmdOptions(evt) {
      this.setState({cmdOptionsText: evt.target.value});
    }

    menuCallback(eventKey) {
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
    render() {
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
    needsModal(eventKey) {
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
    newBattle(conf) {
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

TopMenuLogic.propTypes = {
  addLevel: PropTypes.func.isRequired,
  level: PropTypes.objectOf(RG.Map.Level),
  onRef: PropTypes.func
};
