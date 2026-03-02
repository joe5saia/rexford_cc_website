.PHONY: serve build ci clean

serve:
	hugo server -D

build:
	hugo --minify

ci:
	./scripts/ci-local.sh

clean:
	rm -rf public resources/_gen .hugo_build.lock
