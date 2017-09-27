
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ModalHeader from './modal-header';

/* This component shows the game overworld map in a modal. */
export default class GameOverWorldMap extends Component {

  shouldComponentUpdate(nextProps) {
    if (nextProps.ow !== this.props.ow) {
      return true;
    }

    if (this.props.playerOwPos) {
      if (nextProps.playerOwPos[0] !== this.props.playerOwPos[0]) {
        return true;
      }
      if (nextProps.playerOwPos[1] !== this.props.playerOwPos[1]) {
        return true;
      }
    }
    return false;
  }

  render() {
    let mapStr = 'No map generated.';

    if (this.props.ow) {
      const map = this.props.ow.mapToString().slice();

      // Add player @ to the correct row
      if (this.props.playerOwPos) {
        const [x, y] = this.props.playerOwPos;
        let line = map[y];
        line = line.substr(0, x - 1) + '@' + line.substr(x + 1);
        map[y] = line;
      }
      mapStr = map.join('\n');
    }
    else {
      console.log('this.props.ow is null.');
    }

    return (
      <div
        aria-hidden='true'
        aria-labelledby='game-overworld-map-modal-label'
        className='modal fade'
        id='gameOverWorldMapModal'
        role='dialog'
        tabIndex='-1'
      >
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            <ModalHeader
              id='game-overworld-map-modal-label'
              text={'Overworld'}
            />

            <div className='modal-body row'>
              <div className='col-md-8'>
                <pre className='game-overworld-map-pre'>
                  {mapStr}
                </pre>
                <p>This map helps you to navigate in the world. It shows places
                  of interest as well as the huge mountain walls blocking your
                  passage.
                </p>
              </div>
            </div>

            <div className='modal-footer row'>
              <div className='col-md-4'>
                <button
                  className='btn btn-secondary'
                  data-dismiss='modal'
                  type='button'
                >Close</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

}

GameOverWorldMap.propTypes = {
  ow: PropTypes.object,
  playerOwPos: PropTypes.array
};

