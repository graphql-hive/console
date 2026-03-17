#!/bin/sh
echo "Release: $RELEASE"
node --heapsnapshot-signal=SIGUSR1 index.js
