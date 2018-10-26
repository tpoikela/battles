#! /usr/bin/env bash

npm run build:sass
npm run create-config-prod
NODE_ENV=production ./browserify ./client/jsx/app.jsx --extension .jsx -t babelify -t uglifyify | uglifyjs --compress --mangle > ./build/bundle.js
