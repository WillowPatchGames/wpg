PYTHON?=python3

css: static/css/*.scss
	${PYTHON} -c "import sass" || ${PYTHON} -m pip install libsass
	${PYTHON} -c 'import sass; sass.compile(dirname=("static/css","static/css"), output_style="expanded")'
