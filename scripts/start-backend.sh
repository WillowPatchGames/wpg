#!/bin/bash

./wpgapi -db_type=sqlite -db_host=wpg.sqlite3 -db_sslmode=disable -db_name=wpgdb -debug=true -static_path="http://127.0.0.1:3000" -addr="0.0.0.0:8042" -plan_config=configs/testing-plans.yaml
