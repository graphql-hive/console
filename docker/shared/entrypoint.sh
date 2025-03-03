#!/bin/sh
echo "Release: $RELEASE"
node --heapsnapshot-signal=SIGRTMIN+1 index.js
