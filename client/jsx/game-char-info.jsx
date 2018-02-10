
import React, {Component} from 'react';
import Modal from './modal';
import ModalHeader from './modal-header';
import PropTypes from 'prop-types';

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
    const tabButtons = this.renderTabButtons();

    return (
      <Modal id='char-info-modal' labelId='char-info-modal-label'>
        <ModalHeader id='char-info-modal-label' text='Character info'/>

        {tabButtons}

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
      const expLevel = actor.get('Experience').getExpLevel();
      const expPoints = actor.get('Experience').getExp();
      return (
        <div>
          <div className='modal-body row'>
            <div className='col-md-6'>
              <h2>General info</h2>
              <p>Name: {actor.getName()}</p>
              <p>Class: {actorClassName}</p>
              <p>Race: {actor.getType()}</p>
              <p>Exp. level: {expLevel}</p>
              <p>Exp. points: {expPoints}</p>
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
    else if (this.state.tabShown === 'Skills') {
      const skillComp = actor.get('Skills');
      const skills = Object.keys(skillComp.getSkills());
      const skillElem = skills.map(s => (
        <li key={s}>
          {s} L: {skillComp.getLevel(s)} P: {skillComp.getPoints(s)}
        </li>
      ));
      return (
        <div className='modal-body row'>
          <div className='col-md-6' id='char-info-box'>
            <h2>List of Skills</h2>
            <ul>{skillElem}</ul>
          </div>
        </div>
      );
    }
    else if (this.state.tabShown === 'Battles') {
      const badges = actor.getList('BattleBadge');
      const battlesElem = badges.map(badge => (
        <li key={badge.getID()}>
          <p>
            Name: {badge.getData().name},
            Status: {badge.getData().status},
            Kills: {badge.getData().kill}
          </p>
        </li>
      ));

      return (
        <div className='modal-body row'>
          <div className='col-md-6' id='char-info-box'>
            <h2>List of Battles fought</h2>
            <ul>{battlesElem}</ul>
          </div>
        </div>
      );
    }
    return null;
  }


  renderTabButtons() {
      const buttonElems = (
      <ul className='modal-tab-list'>
        <button
          onClick={this.selectTab.bind(this, 'CharInfo')}
        >CharInfo</button>
        <button
          onClick={this.selectTab.bind(this, 'Components')}
        >Components</button>
        <button
          onClick={this.selectTab.bind(this, 'Skills')}
        >Skills</button>
        <button
          onClick={this.selectTab.bind(this, 'Battles')}
        >Battles</button>
      </ul>
      );

      return (
        <ul>
          {buttonElems}
        </ul>
      );
  }

}

GameCharInfo.propTypes = {
  player: PropTypes.object
};
