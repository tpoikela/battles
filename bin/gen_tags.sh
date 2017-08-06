#! /bin/sh
find ./client -type f -iregex ".*\.js$" -not -path "./node_modules/*" -exec ./jsctags {} -f \; | sed '/^$/d' | sort > tags
