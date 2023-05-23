#!/bin/sh

set -e

npm ci

npx tsc

rm -rf node_modules
