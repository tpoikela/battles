

const spawn = require('child_process').spawn;

const gulp = require('gulp');
const sass = require('gulp-sass');

const babelify = require('babelify');
const browserify = require('browserify');
const browserifyInc = require('browserify-incremental');

const source = require('vinyl-source-stream');
const notify = require('gulp-notify');

const nodemon = require('gulp-nodemon');

const ctags = require('gulp-ctags');

// const spawn = require('child_process').spawn;

const port = process.env.PORT || 8080;

// Define paths for all source files here
const paths = {
    jsxDir: './client/jsx',
    client: ['./client/jsx/*.jsx', './client/**/*.js'],
    sass: ['./scss/*.*'],
    tests: ['./tests/**/*.js'],

    server: './server.js',
    serverIgnore: ['./gulpfile.js', './scss', './pug', './public', './build',
        './app/jsx', './app/common/ajax-functions.js'],

    tags: ['./client/**/*', './server/**/*', './pug/**/*', './scss/**/*']

};

/* Used to notify on build/compile errors.*/
function handleErrors() {
    const args = Array.prototype.slice.call(arguments);
      notify.onError({
        title: 'Compile Error',
        message: '<%= error.message %>'
      }).apply(this, args);
      this.emit('end'); // Keep gulp from hanging on this task
}

const browserifyOpts = {
    entries: paths.jsxDir + '/app.jsx',
    extensions: ['.jsx'],
    debug: true
};

gulp.task('build-js', function() {
    return browserify(browserifyOpts)
        .transform(babelify)
        .bundle()
        .on('error', handleErrors)
        .pipe(source('./bundle.js'))
        .pipe(gulp.dest('build'));
});

// Incrementally building the js
gulp.task('build-js-inc', function() {
	const b = browserify(Object.assign({}, browserifyInc.args,
		browserifyOpts
	));

	browserifyInc(b, {cacheFile: './browserify-cache.json'});

	b.transform(babelify)
		.bundle()
        .on('error', handleErrors)
        .pipe(source('./bundle.js'))
        .pipe(gulp.dest('build'));

});

gulp.task('build-test', function() {
    return browserify({entries:
        ['./client/common/ajax-functions.js', 'test/ajaxFunctionsTest.js'],
        extensions: ['.js'], debug: true})
        .transform(babelify)
        .bundle()
        .pipe(source('./bundleTests.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('build-sass', function() {
	return gulp.src('./scss/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./build'));

});

const buildTasks = ['build-js', 'build-sass'];

gulp.task('build', buildTasks, function() {
    console.log('Building the application.');
});

/* Task for starting/restarting server on any changes.*/
gulp.task('serve', function(cb) {
    const called = false;
    nodemon({
        script: paths.server,
        ext: '.js',
        ignore: paths.serverIgnore,
        env: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            DEBUG: process.env.DEBUG || 0,
            PORT: port
        }
    })
    .on('start', function() {
        if (!called) {
            console.log('Server started on port ' + port);
            called = true;
            cb();
        }
    })
    .on('restart', function(files) {
        if (files) {
            console.log('Nodemon will restart due to changes in: ', files);
        }
    });
});

gulp.task('tests', function() {
    const testProc = spawn('npm run test');
    testProc.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    testProc.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    testProc.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });

});

// Builds ctags-file for easier src navigation in Vim
/* gulp.task('tags', function() {
    console.log('Building ctags for the project.');
    spawn('ctags', ['-R'].concat(paths.tags));
}); */

gulp.task('tags', function() {
  return gulp.src(paths.tags)
    .pipe(ctags({name: 'tags'}))
    .pipe(gulp.dest('./'));
});

const watchDependents = [
  'build-js-inc',
  'tags',
  'build-sass'
];

gulp.task('watch-dev', watchDependents, function() {
    gulp.watch(paths.client, ['build-js-inc']);
    gulp.watch(paths.sass, ['build-sass']);
    gulp.watch(paths.tags, ['tags']);
});

gulp.task('watch-tests', ['tests'], function() {
    gulp.watch(paths.tests, ['tests']);
});

gulp.task('watch', ['watch-dev', 'serve'], function() {
    gulp.watch(paths.server, ['serve']);
});

gulp.task('default', ['watch']);

