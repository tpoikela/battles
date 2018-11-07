
import * as React from 'react';
import ModalHeader from './modal-header';

const RG = require('../src/rg');
RG.Component = require('../src/component');
const Actor = require('../src/actor');
const Modal = require('react-bootstrap-modal');

interface IGameCharInfoProps {
  player: Actor.Rogue;
  showCharInfo: boolean;
  toggleScreen: () => void;
}

export default class GameCharInfo extends React.Component {

  constructor(props: IGameCharInfoProps) {
    super(props);
    this.state = {
      tabShown: 'CharInfo'
    };
  }

  selectTab(tabName: string) {
    this.setState({tabShown: tabName});
  }

  toggleScreen(type: string) {
      this.props.toggleScreen(type);
  }

  public render() {
    const shownMessage = 'Placeholder';
    const shownTabElement = this.renderTabElement(this.state.tabShown);
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
  renderTabElement(tabName) {
    const actor = this.props.player;

    if (tabName === 'CharInfo') {
      return this.renderCharInfoGeneral(actor);
    }
    else if (tabName === 'Effects') {
      return this.renderEffectsTab(actor);
    }
    else if (tabName === 'Skills') {
      return this.renderSkillsTab(actor);
    }
    else if (tabName === 'Battles') {
      return this.renderBattlesTab(actor);
    }
    else if (tabName === 'Quests') {
      return this.renderQuestsTab(actor);
    }
    return null;
  }

  /* Returns buttons for selecting the different tabs. */
  renderTabButtons() {
      const buttonElems = GameCharInfo.menuTabs.map(name => (
        <button className='tab-select-button'
          key={name}
          onClick={this.selectTab.bind(this, name)}
        >{name}</button>
      ));
      return (
        <ul>
          <ul className='modal-tab-list'>
            {buttonElems}
          </ul>
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

      const missileInfo = RG.getMissileAttackInfo(actor);
      const meleeInfo = RG.getMeleeAttackInfo(actor);

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
              <p>Melee: {meleeInfo}</p>
              <p>Missile: {missileInfo}</p>
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
  renderEffectsTab(actor) {
    const comps = Object.values(actor.getComponents());

    const compNames = comps.map((c, index) => {
      const description = RG.Component[c.getType()].description;
      if (description) {
        return (
          <p key={index}>
            <span className='text-info'>{c.getType()}</span> - {description}
          </p>
        );
      }
      return null;
    });

    return (
        <div className='modal-body row' id='char-info-components'>
          <div className='col-md-6' id='char-info-box'>
            <h2>List of effects on player</h2>
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

  /* Renders information about battles fought by the player. */
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

  /* Renders information about quests taken/completed by the player. */
  renderQuestsTab(actor) {
    const quests = actor.getList('Quest');
    const questsElem = quests.map(quest => (
      <li key={quest.getID()}>
        <p>
          {quest.toString()}
        </p>
      </li>

    ));

    return (
      <div className='modal-body row' id='char-info-quests'>
        <div className='col-md-6' id='char-info-box'>
          <h2>Quests received:</h2>
          <ul>{questsElem}</ul>
        </div>
      </div>
    );
  }

  /* Returns the exploration info in a formatted list. */
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
    return <p>No exploration info available</p>;
  }

}

GameCharInfo.menuTabs = [
  'CharInfo', 'Effects', 'Skills', 'Battles', 'Quests'];

