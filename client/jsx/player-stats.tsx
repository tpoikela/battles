
import * as React from 'react';
import {SentientActor} from '../src/actor';

interface IPlayerStatsProps {
    player: SentientActor;
}

/* Component which renders the player stats into the left panel. */
export default class PlayerStats extends React.Component {

    public props: IPlayerStatsProps;

    constructor(props: IPlayerStatsProps) {
      super(props);
    }

    public render() {
        const player = this.props.player;
        const stats = SentientActor.getFormattedStats(player);

        // Create HTML for showing stats
        const statsHTML: any = [];
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

