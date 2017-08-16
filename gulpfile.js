
/* gulpfile for battles roguelike. */

const spawn = require('child_process').spawn;

const gulp = require('gulp');
const sass = require('gulp-sass');

const babelify = require('babelify');
const browserify = require('browserify');
const browserifyInc = require('browserify-incremental');

const source = require('vinyl-source-stream');
const notify = require('gulp-notify');
const nodemon = require('gulp-nodemon');

const port = process.env.PORT || 8080;

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

gulp.task('tags', function() {
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
    });
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
