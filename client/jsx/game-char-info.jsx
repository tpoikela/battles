
import React, {Component} from 'react';
import ModalHeader from './modal-header';
import PropTypes from 'prop-types';

class Modal extends Component {

  render() {
    return (
      <div
        aria-hidden='true'
        aria-labelledby={this.props.labelId}
        className='modal fade'
        id={this.props.id}
        role='dialog'
        tabIndex='-1'
      >
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }

}

Modal.propTypes = {
  id: PropTypes.string,
  labelId: PropTypes.string,
  children: PropTypes.array.isRequired
};

export default class GameCharInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      tabShown: 'CharInfo'
    };
  }

  selectTab(tabName) {
    this.setState({tabShown: tabName});
  }

  render() {
    const shownMessage = 'Placeholder';
    const shownTabElement = this.renderTabElement();

    return (
      <Modal id='char-info-modal' labelId='char-info-modal-label'>
        <ModalHeader id='char-info-modal-label' text='Character info'/>

        <ul className='modal-tab-list'>
          <button
            onClick={this.selectTab.bind(this, 'CharInfo')}
          >CharInfo</button>
          <button
            onClick={this.selectTab.bind(this, 'Components')}
          >Components</button>
        </ul>

        {shownTabElement}

        <div className='modal-footer row'>
          <div className='col-md-6'>
            {shownMessage}
          </div>

          <div className='col-md-6'>
            <button
              className='btn btn-danger'
              data-dismiss='modal'
              type='button'
            >Close</button>
          </div>
        </div>

      </Modal>
    );
  }

  renderTabElement() {
    const actor = this.props.player;
    const actorClassName = actor.get('ActorClass').getClassName();
    const comps = Object.values(actor.getComponents());
    const compNames = comps.map((c, index) => <p key={index}>{c.getType()}</p>);

    if (this.state.tabShown === 'CharInfo') {
      return (
        <div>
          <div className='modal-body row'>
            <div className='col-md-6'>
              <h2>General info</h2>
              <p>Name: {actor.getName()}</p>
              <p>Class: {actorClassName}</p>
            </div>

          </div>

          <div className='modal-body row'>
            <div className='col-md-6'>
              <h2>Whatever</h2>
              <p>xxx</p>
              <p>yyy</p>
            </div>

            <div className='col-md-6' id='char-info-box'>
              <h2>Also random</h2>
              <p>Someting goes here.</p>
            </div>
          </div>
        </div>
      );
    }
    else if (this.state.tabShown === 'Components') {
      return (
          <div className='modal-body row'>
            <div className='col-md-6' id='char-info-box'>
              <h2>List of components</h2>
              {compNames}
            </div>
          </div>

      );
    }
    return null;
  }

}

GameCharInfo.propTypes = {
  player: PropTypes.object
};
