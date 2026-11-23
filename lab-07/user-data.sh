#!/bin/bash

su - ec2-user -c 'cd /home/ec2-user && nohup node app.js > app.out 2>&1 &'
