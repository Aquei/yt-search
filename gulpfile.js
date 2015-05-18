var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var minifyHTML = require('gulp-minify-html');

gulp.task('style', function(){
	var sassOpts = {
		outputStyle: "compressed",
		precision: 8
	};
	gulp.src("dev/*.scss")
		.pipe(sass(sassOpts))
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(gulp.dest('dist'));
});

gulp.task('js', function(){
	gulp.src('dev/*.js')
		.pipe(uglify())
		.pipe(gulp.dest('dist'));
});

gulp.task('html', function(){
	var minifyOpts = {
		empty: true,
		conditionals: true
	};

	gulp.src('dev/*.html')
		.pipe(minifyHTML(minifyOpts))
		.pipe(gulp.dest('dist'));
});

gulp.task('default', ['style', 'js', 'html']);
