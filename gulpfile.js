
var gulp = require('gulp');
var sass = require('gulp-sass');

var babelify = require('babelify');
var browserify = require('browserify');
var browserifyInc = require('browserify-incremental');

var cached = require('gulp-cached');
var source = require('vinyl-source-stream');

var nodemon = require('gulp-nodemon');

var ctags = require('gulp-ctags');

// var spawn = require('child_process').spawn;

var jsxDir = './client/jsx';

var port = process.env.PORT || 8080;

// Define paths for all source files here
var paths = {
    client: ['./client/jsx/*.jsx', './client/**/*.js'],
    sass: ['./scss/*.*'],

    server: './server.js',
    serverIgnore: ['./gulpfile.js', './scss', './pug', './public', './build',
        './app/jsx', './app/common/ajax-functions.js'],

    tags: ['./client/**/*', './server/**/*', './pug/**/*', './scss/**/*']

};

var browserifyOpts = {
    entries: jsxDir + '/app.jsx',
    extensions: ['.jsx'],
    debug: true
};

gulp.task('build-js', function() {
    return browserify(browserifyOpts)
        .transform(babelify)
        .bundle()
        .pipe(source('./bundle.js'))
        .pipe(gulp.dest('build'));
});

// Incrementally building the js
gulp.task('build-js-inc', function() {
	var b = browserify(Object.assign({}, browserifyInc.args,
		browserifyOpts
	));

	browserifyInc(b, {cacheFile: './browserify-cache.json'});

	b.transform(babelify)
		.bundle()
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

var buildTasks = ['build-js', 'build-sass'];

gulp.task('build', buildTasks, function() {
    console.log('Building the application.');
});

/* Task for starting/restarting server on any changes.*/
gulp.task('serve', function(cb) {
    var called = false;
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

// Builds ctags-file for easier src navigation in Vim
/* gulp.task('tags', function() {
    console.log('Building ctags for the project.');
    spawn('ctags', ['-R'].concat(paths.tags));
}); */

gulp.task('tags', function() {
  return gulp.src(paths.tags)
	.pipe(cached('ctags'))
    .pipe(ctags({name: 'tags'}))
    .pipe(gulp.dest('./'));
});

var watchDependents = [
  'build-js',
  'tags',
  'build-sass'
];

gulp.task('watch-cli', watchDependents, function() {
    gulp.watch(paths.client, ['build-js-inc']);
    gulp.watch(paths.sass, ['build-sass']);
    gulp.watch(paths.tags, ['tags']);
});

gulp.task('watch', ['watch-cli', 'serve'], function() {
    gulp.watch(paths.server, ['serve']);
});


gulp.task('default', ['watch']);

