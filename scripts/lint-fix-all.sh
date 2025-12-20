#!/bin/sh
npx eslint . --ext .ts,.tsx --fix
npx prettier --write .
