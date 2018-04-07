
import React from 'react';
import PropTypes from 'prop-types';

const Modal = require('react-bootstrap-modal');

/* This component is shown when a new game is being created. It renders various
* progress messages for the player. */
export default class GameCreatingScreen extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      progress: []
    };
    this.onHide = this.onHide.bind(this);
  }

  render() {
    const progressMsg = this.renderProgressMsg();
    let doneButton = null;
    const msg = this.props.progress;

    if (msg && msg.length > 0) {
      if (msg === 'DONE') {
        const nLast = this.state.progress.length - 1;
        let lastMsg = this.state.progress[nLast];
        lastMsg += msg;
        this.state.progress[nLast] = lastMsg;
      }
      else {
        this.state.progress.push(this.props.progress);
      }
    }

    if (this.props.gameCreated) {
      doneButton = this.renderDoneButton();
    }

    return (
      <Modal
        aria-labelledby={'game-create-modal-label'}
        id='gameCreateModal'
        large={true}
        onHide={this.onHide.bind(this)}
        show={this.props.showCreateScreen}
      >
        <Modal.Header closeButton={true}>
          <Modal.Title
            id='game-start-modal-label'
          >Creating the game
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {progressMsg}
        </Modal.Body>

        <Modal.Footer>
          {doneButton}
        </Modal.Footer>

      </Modal>
    );
  }

  onHide() {
    this.state.progress = [];
    this.toggleScreen('CreateScreen');
  }

  renderProgressMsg() {
    const msgList = this.state.progress.map((msg, index) => {
      const key = index + msg.substring(0, 1);
      return <li className='text-info' key={key}>{msg}</li>;
    });
    return <ul>{msgList}</ul>;
  }

  renderDoneButton() {
    return (
      <button
        className='btn btn-success'
        data-dismiss='modal'
        id='embark-button'
        onClick={this.onHide}
        type='button'
      >Embark!
      </button>
    );
  }

  toggleScreen(type) {
    this.props.toggleScreen(type);
  }

}

GameCreatingScreen.propTypes = {
  gameCreated: PropTypes.bool,
  progress: PropTypes.string,
  showCreateScreen: PropTypes.bool,
  toggleScreen: PropTypes.func.isRequired
};
