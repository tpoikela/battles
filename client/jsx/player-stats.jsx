
import React from 'react';
import PropTypes from 'prop-types';

const RG = require('../src/rg');

/* Component which renders the player stats into the left panel. */
export default class PlayerStats extends React.Component {

    constructor(props) {
      super(props);
    }

    render() {
        const player = this.props.player;
        const dungeonLevel = player.getLevel().getLevelNumber();
        const location = RG.formatLocationName(player.getLevel());

        let PP = null;
        if (player.has('SpellPower')) {
          PP = player.get('SpellPower').getPP() + '/'
          + player.get('SpellPower').getMaxPP();
        }

        // Compile final stats information
        const stats = {
          HP: player.get('Health').getHP() + '/'
          + player.get('Health').getMaxHP(),
          PP,

          Att: [player.getAttack(), player.getCombatBonus('getAttack')],
          Def: [player.getDefense(), player.getCombatBonus('getDefense')],
          Pro: [player.getProtection(), player.getCombatBonus('getProtection')],

          Str: [player.getStrength(), player.getStatBonus('getStrength')],
          Agi: [player.getAgility(), player.getStatBonus('getAgility')],
          Acc: [player.getAccuracy(), player.getStatBonus('getAccuracy')],
          Wil: [player.getWillpower(), player.getStatBonus('getWillpower')],
          Per: [player.getPerception(), player.getStatBonus('getPerception')],
          Mag: [player.getMagic(), player.getStatBonus('getMagic')],

          Speed: [player.getSpeed(), player.getStatBonus('getSpeed')],
          XP: player.get('Experience').getExp(),
          XL: player.get('Experience').getExpLevel(),
          DL: dungeonLevel,
          Loc: location
        };

        if (player.has('Hunger')) {
            stats.E = player.get('Hunger').getEnergy();
        }

        // Create HTML for showing stats
        const statsHTML = [];
        let index = 0;
        for (const key in stats) {
          if (key) {
            const val = stats[key];
            if (Array.isArray(val)) {
              const appliedBonus = val[1];
              let className = '';
              let bonusStr = '';
              if (appliedBonus < 0) {
                className = 'text-danger';
                bonusStr = `(${val[1]})`;
              }
              else if (appliedBonus > 0) {
                className = 'text-success';
                bonusStr = `(+${val[1]})`;
              }

              statsHTML.push(<li className={className} key={key + ',' + index}>
                {key}: {`${val[0]}${bonusStr}`}
              </li>);
            }
            else {
              statsHTML.push(<li key={key + ',' + index}>{key}: {val}</li>);
            }
            ++index;
          }
        }

        return <ul className='game-stats-list'>{statsHTML}</ul>;
    }
}

PlayerStats.propTypes = {
    player: PropTypes.object
};
