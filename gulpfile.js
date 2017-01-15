var gulp = require('gulp');
var babel = require('gulp-babel');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var bower = require('main-bower-files');
var concat = require('gulp-concat');
var watch = require('gulp-watch');


// for compass
var compass = require('gulp-compass');

var srcDir = './src';
var destDir = './build';

// for electron
var electron = require('electron-connect').server.create({'path': destDir + "/"});


gulp.task('app-file-copy', function() {
    gulp.src(['main.js', 'config.json', 'package.json'])
        .pipe(gulp.dest(destDir + '/'));
});


gulp.task('html-copy', function() {
    gulp.src(srcDir + '/html/**/*.html')
        .pipe(gulp.dest(destDir + '/html/'));
});


gulp.task('compass', function() {
    gulp.src(srcDir + '/sass/**/*.scss')
        .pipe(plumber())
        .pipe(compass({
            config_file: './config/compass.rb',
            comments: false,
            css: destDir + '/css/',
            sass: srcDir + '/sass/'
        }));
});

gulp.task('babel', function() {
    gulp.src(srcDir + '/js/**/*.js')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(destDir + '/js/'));
});


gulp.task('copy-js-ext', function() {
    gulp.src(bower())
        .pipe(concat('ext-lib.js'))
        .pipe(gulp.dest(destDir + '/js/ext/'));
});



gulp.task('watch', function() {
    watch(['main.js', 'config.json'], function(event) {
        gulp.start('app-file-copy');
    });
    watch(srcDir + '/html/**/*.html', function(event) {
        gulp.start('html-copy');
    });
    watch(srcDir + '/sass/**/*.scss', function(event) {
        gulp.start('compass');
    });
    watch(srcDir + '/js/**/*.js', function(event) {
        gulp.start('babel');
    });
    watch('./bower_components/**/*.js', function(event) {
        gulp.start('copy-js-ext');
    });
});


gulp.task('start', ['watch'], function() {
    electron.start();
    gulp.watch([destDir + '/main.js', destDir + '/config.json', destDir + '/package.json'], electron.restart);
    gulp.watch(destDir + '/**/*.*', electron.reload);
});


gulp.task('default', [
    'app-file-copy',
    'html-copy',
    'compass',
    'babel',
    'copy-js-ext'
    ]
);
