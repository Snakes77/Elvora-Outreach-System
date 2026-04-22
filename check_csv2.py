import csv
import os
import time
csv_path = '/Users/paulmeakin/Desktop/care_home_in_East_Midlands_2026-04-14__results.csv'
try:
    mod_time = os.path.getmtime(csv_path)
    print(f"File last modified: {time.ctime(mod_time)}")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count = 0
        names = []
        missing_names = 0
        for row in reader:
            count += 1
            n1 = row.get('decision_maker_name')
            if n1: names.append(n1)
            else: missing_names += 1
            
        print(f"Total rows: {count}")
        print(f"Rows with decision_maker_name populated: {len(names)}")
        print(f"Rows missing decision_maker_name: {missing_names}")
        
except Exception as e:
    print(e)
