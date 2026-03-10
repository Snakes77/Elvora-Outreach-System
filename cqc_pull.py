import sys,zipfile,csv,argparse
from io import BytesIO
from datetime import datetime
from pathlib import Path
from xml.etree.ElementTree import iterparse

NS_T='urn:oasis:names:tc:opendocument:xmlns:table:1.0'
NS_X='urn:oasis:names:tc:opendocument:xmlns:text:1.0'
TAG_TABLE=f'{{{NS_T}}}table'
TAG_ROW=f'{{{NS_T}}}table-row'
TAG_CELL=f'{{{NS_T}}}table-cell'
TAG_P=f'{{{NS_X}}}p'
ATTR_NAME=f'{{{NS_T}}}name'
ATTR_REP=f'{{{NS_T}}}number-columns-repeated'
ATTR_RRPT=f'{{{NS_T}}}number-rows-repeated'
OVERDUE={'outstanding':548,'good':730,'requires improvement':365,'inadequate':180}
SCORE={'inadequate':40,'requires improvement':20,'good':5,'outstanding':2}
CANON={'outstanding':'Outstanding','good':'Good','requires improvement':'Requires Improvement','inadequate':'Inadequate'}
SKIP={'Not Rated','Not applicable','Insufficient evidence to rate','No Approved Rating','Regulations met'}

def g(cells,headers,col):
    try:
        i=headers.index(col)
        return cells[i] if i<len(cells) else ''
    except ValueError:
        return ''

def merge(cells,headers,locs,rset):
    if g(cells,headers,'Care Home?')!='Y':return
    region=g(cells,headers,'Location Region')
    if region.lower() not in rset:return
    lid=g(cells,headers,'Location ID')
    domain=g(cells,headers,'Domain').lower()
    svc=g(cells,headers,'Service / Population Group').lower()
    rating=g(cells,headers,'Latest Rating')
    pub=g(cells,headers,'Publication Date')
    if lid not in locs:
        locs[lid]={'name':g(cells,headers,'Location Name'),'region':region,
            'la':g(cells,headers,'Location Local Authority'),
            'street':g(cells,headers,'Location Street Address'),
            'city':g(cells,headers,'Location City'),
            'postcode':g(cells,headers,'Location Post Code'),
            'provider':g(cells,headers,'Provider Name'),'url':g(cells,headers,'URL'),
            'overall':'','safe':'','effective':'','caring':'','responsive':'','well_led':'','date':''}
    rec=locs[lid]
    if domain=='overall' and svc=='overall':
        rec['overall']=rating
        rec['date']=pub
    elif domain=='safe':rec['safe']=rating
    elif domain=='effective':rec['effective']=rating
    elif domain=='caring':rec['caring']=rating
    elif domain=='responsive':rec['responsive']=rating
    elif domain=='well-led':rec['well_led']=rating

def parse_ods(path,rset):
    with zipfile.ZipFile(path) as z:raw=z.read('content.xml')
    print(f'  Parsing {len(raw):,} bytes...',flush=True)
    in_sheet=False;headers=[];locs={}
    rc=[];ct='';cr=1;in_row=False;in_cell=False;n=0
    for event,elem in iterparse(BytesIO(raw),events=('start','end')):
        tag=elem.tag
        if event=='start':
            if tag==TAG_TABLE:in_sheet=(elem.get(ATTR_NAME,'')=='Locations')
            elif in_sheet:
                if tag==TAG_ROW:in_row=int(elem.get(ATTR_RRPT,'1'))<=5;rc=[]
                elif in_row and tag==TAG_CELL:in_cell=True;ct='';cr=int(elem.get(ATTR_REP,'1'))
        elif event=='end':
            if tag==TAG_P and in_cell:
                t=(elem.text or '').strip()
                if t:ct=(ct+' '+t).strip() if ct else t
            elif tag==TAG_CELL and in_row:
                rc.extend([ct]*min(cr,30));in_cell=False;ct='';cr=1;elem.clear()
            elif tag==TAG_ROW and in_row:
                if any(rc):
                    if not headers:headers=rc[:]
                    else:
                        n+=1
                        if n%20000==0:print(f'    {n:,} rows...',flush=True)
                        merge(rc,headers,locs,rset)
                in_row=False;rc=[];elem.clear()
            elif tag==TAG_TABLE and in_sheet:break
    print(f'  Parsed {n:,} rows, {len(locs):,} care homes')
    return locs

def score(rec):
    cr=rec['overall'].lower();today=datetime.today();last=None
    for fmt in ('%d/%m/%Y','%Y-%m-%d'):
        try:last=datetime.strptime(rec['date'].strip(),fmt);break
        except:pass
    days=(today-last).days if last else None
    thr=OVERDUE.get(cr)
    overdue=bool(thr and days and days>thr and cr in('good','outstanding'))
    tier=1 if overdue else(3 if cr=='requires improvement' else(4 if cr=='inadequate' else 0))
    sc=SCORE.get(cr,0)
    if overdue and days and thr:sc+=min(30,(days-thr)//30)
    BAD={'requires improvement','inadequate'}
    if rec['safe'].lower() in BAD:sc+=10
    if rec['well_led'].lower() in BAD:sc+=8
    if rec['effective'].lower() in BAD:sc+=4
    if rec['responsive'].lower() in BAD:sc+=3
    return tier,sc,overdue,days,last.strftime('%Y-%m-%d') if last else '',CANON.get(cr,rec['overall'])

p=argparse.ArgumentParser(description='Elvora CQC prospect pull')
p.add_argument('ods_file')
p.add_argument('--regions',nargs='+',default=['East Midlands','East of England','London','North East','North West','South East','South West','West Midlands','Yorkshire and The Humber'])
p.add_argument('--tiers',nargs='+',type=int,choices=[1,2,3,4])
p.add_argument('--output',default='bd/prospects.csv')
p.add_argument('--all-good',action='store_true')
args=p.parse_args()

print(f'\n  Elvora CQC Prospect Pull\n  ======================')
print(f'  Regions : {", ".join(args.regions)}\n  Source  : {args.ods_file}\n')
locs=parse_ods(args.ods_file,set(r.lower() for r in args.regions))
print(f'\n  Scoring {len(locs):,} locations...',flush=True)
rows=[]
for lid,rec in locs.items():
    if rec['overall'] in SKIP or not rec['overall']:continue
    tier,sc,overdue,days,last_d,crd=score(rec)
    if tier==0 and not args.all_good:continue
    if args.tiers and tier not in args.tiers:continue
    addr=', '.join(x for x in [rec['street'],rec['city'],rec['postcode']] if x)
    rows.append({'bd_tier':tier,'bd_priority_score':sc,'location_id':lid,
        'location_name':rec['name'],'provider_name':rec['provider'],'address':addr,
        'region':rec['region'],'local_authority':rec['la'],'phone':'','website':rec['url'],
        'current_rating':crd,'last_inspection':last_d,'days_since_insp':days or '',
        'overdue_flag':'Y' if overdue else 'N','safe_rating':rec['safe'],
        'effective_rating':rec['effective'],'caring_rating':rec['caring'],
        'responsive_rating':rec['responsive'],'well_led_rating':rec['well_led'],
        'outreach_status':'','notes':''})
rows.sort(key=lambda r:(int(r['bd_tier']),-int(r['bd_priority_score'] or 0)))
counts={}
for r in rows:counts[r['bd_tier']]=counts.get(r['bd_tier'],0)+1
tl={1:'Tier 1  Overdue (Good/Outstanding)',3:'Tier 3  Requires Improvement',4:'Tier 4  Inadequate'}
print(f'\n  Results:')
for t,c in sorted(counts.items(),key=str):print(f'    {tl.get(t,f"Tier {t}")}: {c:,}')
if rows:
    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    fields=['bd_tier','bd_priority_score','location_id','location_name','provider_name','address','region','local_authority','phone','website','current_rating','last_inspection','days_since_insp','overdue_flag','safe_rating','effective_rating','caring_rating','responsive_rating','well_led_rating','outreach_status','notes']
    with open(args.output,'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
    print(f'\n  Written {len(rows):,} prospects to: {args.output}')
print('\n  Next steps:\n  1. Open bd/prospects.csv in Numbers\n  2. Pick a Location ID\n  3. Paste into CLAUDE-bd.md Active Task\n')
