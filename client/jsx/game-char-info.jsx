
import React, {Component} from 'react';
import ModalHeader from './modal-header';
import PropTypes from 'prop-types';

const RG = require('../src/rg');
const Modal = require('react-bootstrap-modal');

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

  toggleScreen(type) {
      this.props.toggleScreen(type);
  }

  render() {
    const shownMessage = 'Placeholder';
    const shownTabElement = this.renderTabElement();
    const tabButtons = this.renderTabButtons();

    return (
      <Modal
        aria-labelledby='char-info-modal-label'
        id='char-info-modal'
        large={true}
        onHide={this.toggleScreen.bind(this, 'CharInfo')}
        show={this.props.showCharInfo}
      >
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
              onClick={this.toggleScreen.bind(this, 'CharInfo')}
              type='button'
            >Close</button>
          </div>
        </div>

      </Modal>
    );
  }

  /* Returns the markup for shown tab element. */
  renderTabElement() {
    const actor = this.props.player;

    if (this.state.tabShown === 'CharInfo') {
      return this.renderCharInfoGeneral(actor);
    }
    else if (this.state.tabShown === 'Components') {
      return this.renderComponentsTab(actor);
    }
    else if (this.state.tabShown === 'Skills') {
      return this.renderSkillsTab(actor);
    }
    else if (this.state.tabShown === 'Battles') {
      return this.renderBattlesTab(actor);
    }
    return null;
  }

  /* Returns buttons for selecting the different tabs. */
  renderTabButtons() {
      const buttonElems = (
      <ul className='modal-tab-list'>
        <button className='tab-select-button'
          onClick={this.selectTab.bind(this, 'CharInfo')}
        >CharInfo</button>
        <button className='tab-select-button'
          onClick={this.selectTab.bind(this, 'Components')}
        >Components</button>
        <button className='tab-select-button'
          onClick={this.selectTab.bind(this, 'Skills')}
        >Skills</button>
        <button className='tab-select-button'
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

  /* Returns the general character info tab for rendering. */
  renderCharInfoGeneral(actor) {
      let actorClassName = 'None';
      if (actor.has('ActorClass')) {
          actorClassName = actor.get('ActorClass').getClassName();
      }
      const expLevel = actor.get('Experience').getExpLevel();
      const expPoints = actor.get('Experience').getExp();
      const exploreInfo = this.getExploreInfo(actor);
      const reqExp = RG.getExpRequired(expLevel + 1);
      const expMissing = reqExp - expPoints;
      return (
        <div>
          <div className='modal-body row' id='char-info-general'>
            <div className='col-md-6'>
              <h2>General info</h2>
              <p>Name: {actor.getName()}</p>
              <p>Class: {actorClassName}</p>
              <p>Race: {actor.getType()}</p>
              <p>Exp. level: {expLevel}</p>
              <p>Exp. points: {expPoints}</p>
              <p>To next level: {expMissing} ({reqExp})</p>
            </div>
            <div className='col-md-6'>
                <h2>Exploration</h2>
                {exploreInfo}
            </div>
          </div>

          <div className='modal-body row'>
            <div className='col-md-6'>
              <h2>Combat info</h2>
              <p>Melee:</p>
              <p>Missile:</p>
            </div>

            <div className='col-md-6' id='char-info-box'>
              <h2>Also random</h2>
              <p>Someting goes here.</p>
            </div>
          </div>
        </div>
      );
  }

  /* Returns the components tab containing info about all relevant components.
   * */
  renderComponentsTab(actor) {
    const comps = Object.values(actor.getComponents());
    const compNames = comps.map((c, index) => <p key={index}>{c.getType()}</p>);
    return (
        <div className='modal-body row' id='char-info-components'>
          <div className='col-md-6' id='char-info-box'>
            <h2>List of components</h2>
            {compNames}
          </div>
        </div>
    );
  }

  /* Returns the tab showing different players skills. */
  renderSkillsTab(actor) {
      let skillElem = null;
      if (!actor.has('Skills')) {
          skillElem = <li>Actor has no skills.</li>;
      }
      else {
          const skillComp = actor.get('Skills');
          const skills = Object.keys(skillComp.getSkills());
          skillElem = skills.map(s => (
            <li key={s}>
              {s} L: {skillComp.getLevel(s)} P: {skillComp.getPoints(s)}
            </li>
          ));
      }
      return (
        <div className='modal-body row' id='char-info-skills'>
          <div className='col-md-6' id='char-info-box'>
            <h2>List of Skills</h2>
            <ul>{skillElem}</ul>
          </div>
        </div>
      );
  }

  renderBattlesTab(actor) {
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
      <div className='modal-body row' id='char-info-battles'>
        <div className='col-md-6' id='char-info-box'>
          <h2>Battles fought</h2>
          <ul>{battlesElem}</ul>
        </div>
      </div>
    );
  }

  /* Returns the exploration info in formatted list. */
  getExploreInfo(actor) {
    if (actor.has('GameInfo')) {
      const gameInfo = actor.get('GameInfo');
      const zones = gameInfo.getData().zones;
      const infoList = [];
      let numPlacesExplored = 0;
      Object.keys(zones).forEach((zone, i) => {
        const pElem = (<p key={zone + '_' + i}>
          {zone}: Explored {zones[zone]} zones
        </p>);
        infoList.push(pElem);
        numPlacesExplored += zones[zone];
      });

      infoList.push((<p key={'total-explored'}>
        Total number of places explored: {numPlacesExplored}
      </p>));

      return infoList;
    }
    return <p>No info available</p>;
  }

}

GameCharInfo.propTypes = {
  player: PropTypes.object,
  showCharInfo: PropTypes.bool.isRequired,
  toggleScreen: PropTypes.func.isRequired
};
