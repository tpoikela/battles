import * as React from 'react';

interface IModalHeaderProps {
    id: string;
    text: string;
}

/* Header component for modals.*/
const ModalHeader = (props: IModalHeaderProps) => (
    <div className='modal-header'>
        <button
            aria-label='Close'
            className='close'
            data-dismiss='modal'
            type='button'
        >
            <span aria-hidden='true'>&times;</span>
        </button>
        <h4 className='modal-title' id={props.id}>{props.text}</h4>
    </div>
);

export default ModalHeader;
