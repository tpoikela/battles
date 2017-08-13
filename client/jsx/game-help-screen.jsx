'use strict';

/* eslint max-len: 100 */

const React = require('react');
const RG = require('../src/rg.js');
const ModalHeader = require('./modal-header');

const TextHelp = props => (
    <p>
        <span className='text-primary'>{props.char}</span>
        {'- ' + props.descr}
    </p>
);

TextHelp.propTypes = {
    char: React.PropTypes.string,
    descr: React.PropTypes.string
};

/** This component contains short info on keys and how to play the game.*/
const GameHelpScreen = React.createClass({

    shouldComponentUpdate: function() {
        return false;
    },

    render: function() {
        console.log('render() GameHelpScreen');
        return (
            <div
                aria-hidden='true'
                aria-labelledby='game-help-modal-label'
                className='modal fade'
                id='gameHelpModal'
                role='dialog'
                tabIndex='-1'
            >
                <div className='modal-dialog modal-lg'>
                    <div className='modal-content'>
                        <ModalHeader id='game-help-modal-label' text={RG.gameTitle + 'Help'}/>
                        <div className='modal-body row'>
                            <div className='col-md-6'>
                                <p>To move around, use:</p>
                                <table className='table table-large mov-buttons-table'>
                                    <thead />
                                    <tbody>
                                        <tr><td>{'\u2B09'} q</td><td>{'\u2B06'} w</td><td>{'\u2B08'} e</td></tr>
                                        <tr><td>{'\u2B05'} a</td><td>Rest: s</td><td>{'\u27A1'} d</td></tr>
                                        <tr><td>{'\u2B0B'} z</td><td>{'\u2B07'} x</td><td>{'\u2B0A'} c</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className='col-md-6 help-info-buttons'>
                                <TextHelp char={'b'} descr={'Use stairs/passage.'} />
                                <TextHelp char={'f'} descr={'Change fight mode.'} />
                                <TextHelp char={'h'} descr={'See next item in the cell.'} />
                                <TextHelp char={'i'} descr={'Show inventory.'} />
                                <TextHelp char={'l'} descr={'Look around.'} />
                                <TextHelp char={'m'} descr={'Toggle the map/player view.'} />
                                <TextHelp char={'n'} descr={'Next target (target/look).'} />
                                <TextHelp char={'o'} descr={'Open/close door.'} />
                                <TextHelp char={'p'} descr={'Use your powers.'} />
                                <TextHelp char={'r'} descr={'Toggle run mode (1.5 x speed).'} />
                                <TextHelp char={'t'} descr={'Enter targeting mode. Press again to fire.'} />
                                <TextHelp char={'u'} descr={'Use an item.'} />
                                <TextHelp char={','} descr={'Pick up an item.'} />
                                <TextHelp char={'.'} descr={'Rest (takes less energy than moving).'} />
                            </div>
                        </div>

                        <div className='modal-footer row'>
                            <div className='col-md-6'>
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

});

module.exports = GameHelpScreen;
