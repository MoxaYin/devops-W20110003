#!/bin/bash

set -euo pipefail

LB_DNS="${1:?Usage: $0 <load-balancer-dns>}"

curl -s "http://${LB_DNS}/?[1-100]" | sort | uniq -c
