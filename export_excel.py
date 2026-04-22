import json
import pandas as pd

def main():
    with open('priority_batch.json', 'r') as f:
        data = json.load(f)
        
    filtered_data = [
        item for item in data 
        if item.get('region') in ['East Midlands', 'West Midlands']
    ]
    
    df = pd.DataFrame(filtered_data)
    
    # We can rearrange the columns if we like, or just output all
    # Let's save all fields as the user asked for all the targets
    
    filename = 'Melissas_First_Campaign_Midlands_Targets.xlsx'
    df.to_excel(filename, index=False)
    print(f"Exported {len(df)} records to {filename}")

if __name__ == '__main__':
    main()
