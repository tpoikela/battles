
const React = require('react');
const ReactDOM = require('react-dom');
const BattlesTop = require('./top.jsx');

const whyDidYouUpdate = require('why-did-you-update').whyDidYouUpdate;

ReactDOM.render(
    <BattlesTop />,
    document.getElementById('mount-point')
);

if (/debug/.test(document.location.search)) {
	/* eslint-disable */
	let createClass = React.createClass;
    Object.defineProperty(React, 'createClass', {
      set: (nextCreateClass) => {
        createClass = nextCreateClass;
      }
    });
	const conf = {};
    whyDidYouUpdate(React, conf);
}
