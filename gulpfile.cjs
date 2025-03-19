let gulp = require('gulp');
let less = require('gulp-less');

gulp.task('less', function () {
    return gulp
        .src('./styles/swerpg.less')
        .pipe(less())
        .pipe(gulp.dest('./styles'));
});

gulp.task('styles', function () {
    return gulp
        .src('./styles/swerpg.less')
        .pipe(less())
        .pipe(gulp.dest('./styles/'));
});

gulp.task('default', function () {
    return gulp.watch('./styles/**/*.less', gulp.series('styles'));
});