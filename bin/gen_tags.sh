#! /bin/sh
find ./client -type f -iregex ".*\.js$" -not -path "./node_modules/*" -exec ./jsctags {} -f \; | sed '/^$/d' > tags_temp
#find ./client -type f -iregex ".*\.js$" -not -path "./node_modules/*" -exec ./jsctags {} -f \; | sed '/^$/d' | sort > tags_temp
ctags -R ./client/jsx
cat tags >> tags_temp
cat tags_temp | sort >> tags
rm tags_temp
