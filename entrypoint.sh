#!/bin/sh
set -e

npx prisma generate
node app.js
