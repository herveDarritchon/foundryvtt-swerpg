import gulp from 'gulp'
import less from 'gulp-less'
import plumber from 'gulp-plumber'

/* ----------------------------------------- */
/*  LESS paths
/* ----------------------------------------- */

const LESS_SRC = './styles/swerpg.less'
const CSS_DEST = './styles'
const LESS_WATCH = ['./styles/**/*.less']

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

function compileLESS() {
  return gulp
    .src(LESS_SRC, { sourcemaps: false })
    .pipe(
      plumber({
        errorHandler(err) {
          console.error('LESS Error:', err.message)
          this.emit('end')
        },
      }),
    )
    .pipe(less())
    .pipe(gulp.dest(CSS_DEST))
}

/* ----------------------------------------- */
/*  Watch LESS
/* ----------------------------------------- */

function watchLESS() {
  gulp.watch(LESS_WATCH, compileLESS)
}

/* ----------------------------------------- */
/*  Export tasks
/* ----------------------------------------- */

const css = gulp.series(compileLESS)
const watchCss = gulp.series(compileLESS, watchLESS)

export { css }
export { watchCss as 'watch:css' }

export default watchCss
