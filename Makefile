.PHONY: clean, all, docs, test, install, install_pydev, install_angular

clean:
	rm -rf *.out *.xml htmlcov

install:
	virtualenv . && \
		source bin/activate && \
		pip install -r requirements.txt

install_pydev:
	source bin/activate && \
		echo 'import site\n\
site.addsitedir("/Applications/Eclipse.app/Contents/Eclipse/dropins/PyDev 5.0.0/plugins/org.python.pydev_5.0.0.201605051159")\n\
site.addsitedir("/Applications/Eclipse.app/Contents/Eclipse/dropins/PyDev 5.0.0/plugins/org.python.pydev_5.0.0.201605051159/pysrc")' \
> lib/python3.4/sitecustomize.py && \
		python "/Applications/Eclipse.app/Contents/Eclipse/dropins/PyDev 5.0.0/plugins/org.python.pydev_5.0.0.201605051159/pysrc/setup_cython.py" build_ext --inplace

install_angular:
	git remote add angular-ppt https://github.com/HarryPayne/angular-ppt.git && \
	git subtree add --prefix=flask_ppt2/static angular-ppt master
	
myinstall: install install_pydev
	
docs: install
	cd docs && make html && cd ..

test: install
	source venv/bin/activate && \
		py.test --cov=sandman2 tests