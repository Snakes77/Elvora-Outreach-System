import os, time

desktop = '/Users/paulmeakin/Desktop'
files = []
for f in os.listdir(desktop):
    path = os.path.join(desktop, f)
    if os.path.isfile(path) and ('csv' in f.lower() or 'xls' in f.lower()):
        mtime = os.path.getmtime(path)
        files.append((mtime, f))
        
files.sort(reverse=True)
print("Recent files on Desktop:")
for mtime, f in files[:10]:
    print(f"{time.ctime(mtime)} : {f}")
