#!/bin/bash
COMMAND="$1"
if echo "$COMMAND" | grep -qE "rm -rf|DROP TABLE|TRUNCATE"; then
  echo "Blocked: dangerous command"
  exit 2
fi
exit 0
