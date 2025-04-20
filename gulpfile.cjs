const gulp = require('gulp');
const less = require('gulp-less');
const touch = require('gulp-touch-cmd');
const plumber = require('gulp-plumber');

gulp.task('less', function () {
    return gulp
        .src('./styles/swerpg.less')
        .pipe(less())
        .pipe(gulp.dest('./styles'))
        .pipe(touch()); // force update pour que Foundry détecte le changement
});

gulp.task('styles', function () {
    return gulp
        .src('./styles/swerpg.less')
        .pipe(plumber({
            errorHandler: function (err) {
                console.error('LESS Error:', err.message);
                this.emit('end');
            }
        }))
        .pipe(less())
        .pipe(gulp.dest('./styles/'))
        .pipe(touch())
        .on('end', () => console.log('✅ swerpg.css compiled and updated'));
});

gulp.task('default', gulp.series('styles', function () {
    return gulp.watch('./styles/**/*.less', gulp.series('styles'));
}));
