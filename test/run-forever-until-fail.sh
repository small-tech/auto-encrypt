#!/bin/sh

npm run test

if [ $? -ne 0 ]
then
  exit 1
fi

SELF=`readlink -f "$0"`
$SELF
