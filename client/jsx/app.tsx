
import React from 'react';
import ReactDOM from 'react-dom';
import {BattlesTop} from './top';

ReactDOM.render(
    <BattlesTop />,
    document.getElementById('mount-point')
);

if (/debug/.test(document.location.search)) {
    /* eslint-disable */
    let createClass = (React as any).createClass;
    Object.defineProperty(React, 'createClass', {
      set: (nextCreateClass) => {
        createClass = nextCreateClass;
      }
    });
}
