#!/bin/sh
echo "Release: $RELEASE"
node $NODEJS_FLAGS --heapsnapshot-signal=SIGUSR1 index.js
