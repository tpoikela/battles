
import * as React from 'react';

interface ISimulationButtonsProps {
    menuCallback: (id: string) => void;
    simulationStarted: boolean;
};

/*
const buttons = {
    Simulate: 'simulateLevel',
    Step: 'stepSimulation',
    Play: 'playSimulation',
    '>>>': 'playFastSimulation',
    Pause: 'pauseSimulation',
    Stop: 'stopSimulation'
};
*/

export default class SimulationButtons extends React.Component {

    public props: ISimulationButtonsProps;

    constructor(props: ISimulationButtonsProps) {
        super(props);
        this.callback = this.callback.bind(this);
    }

    callback(evt) {
        const id = evt.target.id;
        this.props.menuCallback(id);
    }

    render() {
        let ctrlBtnClass = 'btn btn-xs';
        if (!this.props.simulationStarted) {
          ctrlBtnClass = 'btn btn-xs disabled';
        }
        return (
        <div>
        <button
          className='btn btn-xs'
          id='simulateLevel'
          onClick={this.callback}
        >Simulate
        </button>
        <button
          className='btn btn-xs'
          id='stepSimulation'
          onClick={this.callback}
        >Step
        </button>
        <button
          className={ctrlBtnClass}
          id='playSimulation'
          onClick={this.callback}
        >Play
        </button>

        <button
          className={ctrlBtnClass}
          id='playFastSimulation'
          onClick={this.callback}
        >{'>>>'}
        </button>

        <button
          className={ctrlBtnClass}
          id='pauseSimulation'
          onClick={this.callback}
        >Pause
        </button>
        <button
          className={ctrlBtnClass}
          id='stopSimulation'
          onClick={this.callback}
        >Stop
        </button>
        </div>
        );
    }
}
