#!/bin/sh
echo "Release: $RELEASE"
node --heapsnapshot-signal=SIGUSR2 index.js
