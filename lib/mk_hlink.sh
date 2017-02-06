#!/bin/sh

TARGET_DIR="../node_modules"

for file in `\find . -maxdepth 1 -type f`
do
    src=${file}
    target=${TARGET_DIR}/${file}
    ln ${src} ${target}
    echo ${src}" -> "${target}
done
