#! /usr/bin/env bash

npm run build:sass
npm run create-config-prod && NODE_ENV=production ./browserify ./client/jsx/app.jsx --extension .jsx -t babelify | uglifyjs --mangle --compress > ./build/bundle.js
