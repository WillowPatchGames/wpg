#!/bin/bash

if [ ! -e assets/static/public/csw15.txt ]; then
	wget http://pages.cs.wisc.edu/~o-laughl/csw15.txt -O assets/static/public/csw15.txt
	sort assets/static/public/csw15.txt -o assets/static/public/csw15.txt
fi
