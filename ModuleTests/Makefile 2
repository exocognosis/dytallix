.PHONY: all code-shield setup test clean

all: test

setup:
	pip install -r CodeShield/requirements.txt || true

code-shield:
	$(MAKE) -C CodeShield setup corpus run verify

test:
	./test_all.sh

clean:
	$(MAKE) -C CodeShield clean || true
