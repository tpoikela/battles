
import * as React from 'react';

interface IModalProps {
  id: string;
  labelId: string;
  children: any[];
}

export default class Modal extends React.Component {

  public props: IModalProps;

  public render() {
    return (
      <div
        aria-hidden='true'
        aria-labelledby={this.props.labelId}
        className='modal fade'
        id={this.props.id}
        role='dialog'
        tabIndex={-1}
      >
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }

}

