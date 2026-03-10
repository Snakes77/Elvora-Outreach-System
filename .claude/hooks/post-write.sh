#!/bin/bash
FILE="$1"
echo "$(date '+%H:%M:%S') WRITE  $FILE" >> .claude/activity.log
exit 0
