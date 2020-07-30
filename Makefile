PYTHON?=python3

all: build

build: css

css: static/css/*.scss
	${PYTHON} -c "import sass" || ${PYTHON} -m pip install --user libsass
	${PYTHON} -c 'import sass; sass.compile(dirname=("static/css","static/css"), output_style="expanded")'
