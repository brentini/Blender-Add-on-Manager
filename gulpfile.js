var gulp = require('gulp');
var plumber = require('gulp-plumber');
var watch = require('gulp-watch');

// for electron
var electron = require('electron-connect').server.create();

// for compass
var compass = require('gulp-compass');

// for webpack
var webpack = require('gulp-webpack');
var webpackConfig = require('./config/webpack.js');


var srcDir = './src';
var destDir = './build';

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

gulp.task('webpack', function() {
    gulp.src(srcDir + '/ts/**/*.ts')
        .pipe(webpack(webpackConfig))
        .pipe(gulp.dest(destDir + '/js/'));
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
    watch([
        srcDir + '/ts/**/*.ts',
        '!./node_modules/**'
    ], function(event) {
        gulp.start('webpack');
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
    'webpack'
    ]
);

