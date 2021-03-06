#!/bin/bash
subj="/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=localhost"
out_dir=".cert"

[ ! -d $out_dir ] && mkdir $out_dir

cd $out_dir

echo "generating ssl self signed certificates for https testing"

openssl req -nodes -newkey rsa:2048 -keyout server.key -out server.csr -subj "$subj"
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

echo "generated ssl self signed certificates for https testing"