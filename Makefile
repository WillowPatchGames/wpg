PYTHON?=python3

run: npm

npm:
	cd static && REACT_EDITOR=none BROWSER=none npm start
