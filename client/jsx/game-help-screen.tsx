import * as React from 'react';
import ModalHeader from './modal-header';

const RG = require('../src/rg');
const Modal = require('react-bootstrap-modal');
const Manual = require('../data/manual');


interface IGameHelpScreen {
  showHelpScreen: boolean;
  toggleScreen(type: string): void;
}

/* Small helper component. */
export const TextHelp = ({char, descr}) => (
  <p>
    <span className='text-primary'>{char}</span>
    {'- ' + descr}
  </p>
);


/* This component contains short info on keys and how to play the game.*/
export default class GameHelpScreen extends Component {

  public props: IGameHelpScreen;

  public shouldComponentUpdate() {
    return false;
  }

  public render() {
    return (
      <Modal
          aria-labelledby='game-help-modal-label'
          id='gameHelpModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'HelpScreen')}
          show={this.props.showHelpScreen}
      >
        <ModalHeader id='game-help-modal-label' text={RG.gameTitle + 'Help'}/>
        <div className='modal-body'>
          <div className='row'>
            <div className='col-md-12'>
              <div
                dangerouslySetInnerHTML={{__html: Manual.fullText}}
                id='manual-text'
              />
            </div>
          </div>
        </div>

        <div className='modal-footer row'>
          <div className='col-md-6'>
            <button
              className='btn btn-secondary'
              onClick={this.toggleScreen.bind(this, 'HelpScreen')}
              type='button'
            >Close</button>
          </div>
        </div>

      </Modal>
    );
  }

  public toggleScreen(type: string) {
      this.props.toggleScreen(type);
  }

}

