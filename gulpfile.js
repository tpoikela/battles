
/* gulpfile for battles roguelike. */

const spawn = require('child_process').spawn;

const gulp = require('gulp');

const sass = require('gulp-sass');
const rename = require('gulp-rename');
const notify = require('gulp-notify');
const nodemon = require('gulp-nodemon');

const babelify = require('babelify');
const browserify = require('browserify');
const browserifyInc = require('browserify-incremental');

const source = require('vinyl-source-stream');

const port = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// Define paths for all source files here
const paths = {
    jsxDir: './client/jsx',
    client: ['./client/**/*.jsx', './client/**/*.js', './lib/*.js'],
    sass: ['./scss/*.*'],
    tests: ['./tests/client/src/*.js'],

    server: './server.js',
    serverIgnore: ['./gulpfile.js', './scss', './pug', './public', './build',
        './app/jsx', './app/common/ajax-functions.js'],

    tags: ['./client/**/*', './server/**/*', './pug/**/*', './scss/**/*']

};

const browserifyOpts = {
    entries: paths.jsxDir + '/app.jsx',
    extensions: ['.jsx'],
    debug: !isProduction
};

gulp.task('create-config', function() {
    if (isProduction) {
        return gulp.src('./client/config/production.js')
            .pipe(rename('config.js'))
            .pipe(gulp.dest('public'));
    }
    else {
        return gulp.src('./client/config/devel.js')
            .pipe(rename('config.js'))
            .pipe(gulp.dest('public'));
    }
});

gulp.task('build-js', ['create-config'], function() {
    const bundler = browserify(browserifyOpts)
        .transform(babelify);

    bundler
        .bundle()
        .on('error', handleErrors)
        .pipe(source('./bundle.js'))
        .on('error', handleErrors)
        .pipe(gulp.dest('build'));
});

// Incrementally building the js
gulp.task('build-js-inc', ['create-config'], function() {
    const startTime = Date.now();
    const b = browserify(Object.assign({}, browserifyInc.args,
        browserifyOpts
    ));

    browserifyInc(b, {cacheFile: './browserify-cache.json'});
    // browserifyInc(b);

    b.transform(babelify)
        .bundle()
        .on('error', handleErrors)
        .pipe(source('./bundle.js'))
        .pipe(gulp.dest('build'))
        .on('end', () => {
            const endTime = Date.now();
            console.log('Incr-build took ' + (endTime - startTime));
        }
        );

});

gulp.task('build-sass', function() {
    return gulp.src('./scss/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./build'));

});

gulp.task('build-sim', ['create-config'], function() {
    const bOpts = Object.assign({}, browserifyOpts);
    // bOpts.entries = 'scripts/debug-game-sim.js';
    bOpts.entries = paths.jsxDir + '/app-test.jsx';
    const bundler = browserify(bOpts).transform(babelify);

    bundler
        .bundle()
        .on('error', handleErrors)
        .pipe(source('./bundle2.js'))
        .on('error', handleErrors)
        .pipe(gulp.dest('build'));
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


/* Task used for continuous testing. Use watch-tests. */
gulp.task('tests', function() {
    const testProc = spawn('npm', ['run', 'test']);
    const errors = [];
    const mochaData = [];

    testProc.stdout.on('data', (data) => {
        mochaData.push(data);
    });

    testProc.stderr.on('data', (data) => {
        errors.push(data);
    });

    testProc.on('close', (code) => {
        if (code !== 0) {
            const mochaFirstError = getMochaError(mochaData);
            notify.onError({
                title: 'Test Error',
                message: mochaFirstError
            }).apply(this, errors);
        }
    });

});

let tagsRunning = false;

gulp.task('tags', function() {
    if (!tagsRunning) {
        tagsRunning = true;
        const tagsProc = spawn('bin/gen_tags.sh');
        const errors = [];
        tagsProc.stderr.on('data', (data) => {
            errors.push(data);
        });
        tagsProc.on('close', (code) => {
            if (code !== 0) {
                const tagsError = errors.join('\n');
                notify.onError({
                    title: 'Tags Error',
                    message: tagsError
                }).apply(this, errors);
            }
            else {
                gulp.src('./tags')
                .pipe(
                    notify('OK. Tags exited with 0')
                );
            }
            tagsRunning = false;
        });
    }
    else {
        gulp.src('./tags')
        .pipe(
            notify('Tags already running. Skipping.')
        );
    }
});

gulp.task('apply-prod-environment', function() {
    process.env.NODE_ENV = 'production';
});


//---------------------------------------------------------------------------
// WATCH TASSKS
//---------------------------------------------------------------------------

const watchDependents = [
    'build-js-inc',
    'tags',
    'build-sass'
];

const prodDependents = [
    'apply-prod-environment'
];

gulp.task('watch-dev', watchDependents, function() {
    gulp.watch(paths.client, ['build-js-inc']);
    gulp.watch(paths.sass, ['build-sass']);
    gulp.watch(paths.tags, ['tags']);
});

gulp.task('watch-tests', ['tests'], function() {
    const allPaths = paths.tests.concat(paths.client);
    gulp.watch(allPaths, ['tests']);
});

gulp.task('watch', ['watch-dev', 'serve'], function() {
    gulp.watch(paths.server, ['serve']);
});

gulp.task('watch-prod', prodDependents, function() {
    gulp.watch(paths.client, ['build-js-inc']);
    gulp.watch(paths.sass, ['build-sass']);
    gulp.watch(paths.tags, ['tags']);
});

gulp.task('default', ['watch']);

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
//---------------------------------------------------------------------------

/* Used to notify on build/compile errors.*/
function handleErrors() {
    const args = Array.prototype.slice.call(arguments);
    notify.onError({
        title: 'Compile Error',
        message: '<%= error.message %>'
    }).apply(this, args);
    console.error(arguments);
    this.emit('end'); // Keep gulp from hanging on this task
}

/* Extracts the first error from mocha output. */
function getMochaError(lines) {
    const reContext = /at Context\.it \(.*\)/;
    let error = '';
    lines.forEach(line => {
        const str = line.toString();
        if (reContext.test(str)) {
            if (error === '') {
                const match = str.match(reContext);
                error = match[0];
            }
        }
    });
    if (error.length === '') {
        error = 'Error in tests!';
    }
    return error;
}
