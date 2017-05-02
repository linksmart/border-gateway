#!/bin/bash

trap 'npm run stop' INT

npm run $1
