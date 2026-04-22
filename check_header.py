import csv
csv_path = '/Users/paulmeakin/Desktop/care_home_in_East_Midlands_2026-04-14__results.csv'
try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        print("Headers:", headers)
        
        # print first row with blank decision_maker_name
        blank_row = None
        for row in reader:
            row_dict = dict(zip(headers, row))
            if not row_dict.get('decision_maker_name'):
                blank_row = row_dict
                break
        
        if blank_row:
            print("\nExample row with BLANK decision_maker_name:")
            for k, v in blank_row.items():
                print(f"  {k}: {v}")
except Exception as e:
    print(e)
