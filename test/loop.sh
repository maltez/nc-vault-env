#!/usr/bin/env bash

while [[ $# -gt 1 ]]
do
key="$1"
case $key in
    -s|--sleep)
    SLEEP="$2"
    shift
    ;;
    -m|--max_count)
    MAX_COUNT="$2"
    shift
    ;;
    -e|--exit_code)
    EXIT_CODE="$2"
    shift
    ;;
    --print_env)
    PRINT_ENV="$2"
    shift
    ;;
    *)
    ;;
esac
shift
done

trap 'echo "receive signal SIGHUP"; exit ${EXIT_CODE}' 1
trap 'echo "receive signal SIGINT"; exit ${EXIT_CODE}' 2
trap 'echo "receive signal SIGQUIT"; exit ${EXIT_CODE}' 3
trap 'echo "receive signal SIGTERM"; exit ${EXIT_CODE}' 15

echo "PID: $$"
echo "sleep: ${SLEEP}"
echo "max_count: ${MAX_COUNT}"
echo "exit_code: ${EXIT_CODE}"
echo "print_env: ${PRINT_ENV}"

if [ "$PRINT_ENV" -eq "1" ]
then
    env
    exit 0;
fi

COUNTER=1
while true
do
	echo "LOOP (${COUNTER})"

	if [ "$COUNTER" -eq "$MAX_COUNT" ]
    then
        exit ${EXIT_CODE}
    fi

    COUNTER=$((COUNTER+1))
	sleep ${SLEEP}
done
