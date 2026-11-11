# Tạo tài nguyên giao diện từ bộ ảnh: bảng chính 16:9 (đã xóa chữ/ô mẫu), sprite icon trang bị, layout.js
import numpy as np, json, cv2, os
from PIL import Image, ImageDraw
SRC='/tmp/ui/x/Bộ giao diện và trang bị/'; OUT='/home/claude/ETERNAL-PIXEL/'
board=np.array(Image.open('/tmp/ui/board_full.png').convert('RGB')).astype(np.float32); H,W,_=board.shape
K=W/1456.0
V=lambda x,y,w,h:[round(x*K),round(y*K),round(w*K),round(h*K)]
rng=np.random.default_rng(7)
def erase(rect,pad=0,ring=14,sigma=1.0,flat=False):
    x,y,w,h=rect; x-=pad;y-=pad;w+=2*pad;h+=2*pad; x=max(0,x);y=max(0,y)
    R=board[max(0,y-ring):y+h+ring,max(0,x-ring):x+w+ring].copy()
    m=np.ones(R.shape[:2],bool); m[ring:ring+h,ring:ring+w]=False
    ys=np.argmax(np.ones(1)); px=R[m]; 
    # chỉ lấy điểm ảnh không quá sáng (bỏ viền kim loại) để ra màu nền
    lum=px.mean(axis=1); px=px[lum<np.percentile(lum,70)]
    mu,sd=px.mean(axis=0),px.std(axis=0)*0.5
    fill=rng.normal(mu,sd,(h,w,3)); fill=cv2.GaussianBlur(fill.astype(np.float32),(0,0),sigma)
    a=np.ones((h,w),np.float32); a=cv2.GaussianBlur(np.pad(a,6,constant_values=0),(0,0),2.2)[6:-6,6:-6]; a=np.clip(a*1.6,0,1)[...,None]
    board[y:y+h,x:x+w]=board[y:y+h,x:x+w]*(1-a)+fill*a
L={}   # tên -> [x,y,w,h] theo điểm ảnh gốc
# ---- vị trí (hệ tọa độ ảnh gốc) ----
L['title']=V(420,32,616,56); L['close']=V(1346,41,52,52)
L['stage']=V(95,150,275,420); L['pname']=V(140,596,190,22); L['psub']=V(140,618,190,20)
tabc=[482,614,746,884,1020]; L['tabs']=[V(c-62,100,124,33) for c in tabc]
L['stats_lv']=V(788,192,187,25); L['stats_bar']=V(788,219,184,15)
rowsy=[257,279,301,337,358,380,402,423,445,481,501,545,562,578,594,611]; L['srows']=[V(814,y-9,158,18) for y in rowsy]
L['shead']=V(790,519,150,17); L['sbtn']=[V(845,y-8,127,16) for y in (639,661,683,705)]; L['sbtn_hit']=[V(780,y-12,198,24) for y in (639,661,683,705)]
L['itabs']=[V(c-22,157,44,40) for c in (1058,1139,1187,1235,1283,1328,1372)]
L['coin']=V(1066,658,75,20); L['count']=V(1288,656,70,24)
L['track']=V(1418,180,18,336); L['up']=V(1412,144,28,28); L['down']=V(1413,628,28,28)
L['round']=[V(c-19,696,38,38) for c in (268,320,371,420,466,509,556)]
L['diamond']=[V(c-19,753,38,38) for c in (252,303,354,404,455,506,557)]
L['bags']=[V(c-19,745,38,40) for c in (1220,1260,1304,1346,1388,1430)]
# ô lưới túi đồ: 6 cột x 7 hàng (đo chính xác từ ảnh)
x0,y0,cw,ch,px,py=3261,648,183,184,189.6,191.0
L['igrid']=[[round(x0+c*px),round(y0+r*py),cw,ch] for r in range(7) for c in range(6)]
# 10 ô trang bị (bố cục búp bê giấy: trái / giữa / phải)
S=[200,230]; slot=lambda x,y,w,h:[x,y,w,h]
L['eslots']={'helmet':slot(1440,560,200,230),'gloves':slot(1440,830,200,230),'ring1':slot(1440,1100,200,230),'weapon':slot(1440,1370,200,250),
  'armor':slot(1735,560,260,400),'cloak':slot(1735,1000,260,400),
  'necklace':slot(2095,560,200,230),'boots':slot(2095,830,200,230),'ring2':slot(2095,1100,200,230),'accessory':slot(2095,1370,200,250)}
L['setinfo']=[1735,1430,260,170]
# 16 ô thẻ/thú (2 hàng x 8)
bx,by,bw,bh,bp=1415,1785,104,128,113
L['dslots']=[[bx+c*bp,by+r*(bh+22),bw,bh] for r in range(2) for c in range(8)]
L['panel_mid']=V(433,150,305,520); L['panel_all']=V(433,150,962,540)
# ---- xóa chữ / ô / vật phẩm mẫu khỏi ảnh gốc ----
for r in L['tabs']: erase([r[0]+14,r[1]+8,r[2]-28,r[3]-16],ring=10)
erase(V(412,100,142,33),ring=10)    # vệt sáng cam của tab đầu
erase(L['pname'],pad=4); erase(L['psub'],pad=4)
erase(L['stats_lv'],pad=2); erase(L['stats_bar'],pad=2)
for r in L['srows']: erase(r,pad=1)
erase(L['shead'],pad=2)
for r in L['sbtn']: erase(r,pad=1)
erase(V(1067,166,46,22),pad=2); erase(L['coin'],pad=2); erase(L['count'],pad=2)
def synth(rect,sample,feather=7):
    """Tổng hợp lại nền đá tối: nhiễu chỉ theo độ sáng (không lệch màu), cùng màu trung bình với vùng nền sạch."""
    x,y,w,h=rect; sx,sy,sw,sh=sample; P=board[sy:sy+sh,sx:sx+sw].reshape(-1,3); lum=P.mean(axis=1)
    P=P[(lum>np.percentile(lum,15))&(lum<np.percentile(lum,95))]; mu=P.mean(axis=0); cv=P.mean(axis=1).std()/max(1,P.mean())
    n=np.zeros((h,w),np.float32)
    for sig,amp in ((40,.5),(12,.5),(3,.4),(0.8,.5)):
        t=cv2.GaussianBlur(rng.normal(0,1,(h,w)).astype(np.float32),(0,0),sig); n+=t/(t.std()+1e-6)*amp
    fill=mu[None,None,:]*(1+n[...,None]*min(cv,0.25)*0.9)
    m=np.zeros((h+2*feather,w+2*feather),np.float32); m[feather:-feather,feather:-feather]=1; m=cv2.GaussianBlur(m,(0,0),feather/2.2)[feather:-feather,feather:-feather,None]
    board[y:y+h,x:x+w]=board[y:y+h,x:x+w]*(1-m)+fill*m
    print('synth mu',mu.round(1),'cv',round(cv,3))
synth([1420,545,880,1100],(1424,560,18,1000))   # vùng ô trang bị: bỏ khung + kiếm mẫu
synth([1408,1765,900,335],(1424,560,18,1000))   # thanh vật phẩm mẫu
Image.fromarray(np.clip(board,0,255).astype(np.uint8)).save('/tmp/ui/board_clean.png')
im=Image.fromarray(np.clip(board,0,255).astype(np.uint8)).resize((2304,1296),Image.LANCZOS)
im.save(OUT+'assets/ui/board.jpg',quality=88,optimize=True)
# ---- sprite icon trang bị: tách từng icon theo hình dạng thật (ảnh gốc không chia đều), 6 cột (độ hiếm) x 12 hàng (loại) ----
from scipy import ndimage as ndi
rows=[]
for fn,names in (('Bộ biểu tượng trang bị RPG huyền ảo (1) (1).png',['sword','bow','staff','blades','helmet','boots']),('Bộ biểu tượng trang bị RPG huyền ảo (2).png',['ring','cloak','necklace','gloves','hat','book'])):
    sh=Image.open(SRC+fn).convert('RGBA'); A=np.array(sh.getchannel('A'))>40
    lab,n=ndi.label(ndi.binary_dilation(A,iterations=2)); objs=ndi.find_objects(lab)
    comps=[]
    for i,sl in enumerate(objs,1):
        m=(lab[sl]==i)&A[sl]
        if m.sum()<1500: continue
        ys,xs=np.where(m); comps.append((sl[1].start+xs.min(),sl[0].start+ys.min(),sl[1].start+xs.max()+1,sl[0].start+ys.max()+1,m.sum()))
    comps=sorted(comps,key=lambda c:-c[4])[:36]; assert len(comps)==36,(fn,len(comps))
    comps=sorted(comps,key=lambda c:(c[1]+c[3])/2); rws=[sorted(comps[r*6:(r+1)*6],key=lambda c:c[0]) for r in range(6)]
    for r,n_ in enumerate(names):
        row=[]
        for (x0,y0,x1,y1,_a) in rws[r]:
            cell=sh.crop((x0-4,y0-4,x1+4,y1+4)); s_=116/max(cell.size); cell=cell.resize((max(1,round(cell.width*s_)),max(1,round(cell.height*s_))),Image.LANCZOS)
            tile=Image.new('RGBA',(128,128),(0,0,0,0)); tile.paste(cell,((128-cell.width)//2,(128-cell.height)//2),cell); row.append(tile)
        rows.append((n_,row))
sheet=Image.new('RGBA',(128*6,128*len(rows)),(0,0,0,0))
for r,(n,row) in enumerate(rows):
    for c,t in enumerate(row): sheet.paste(t,(c*128,r*128))
sheet.save(OUT+'assets/ui/icons.png',optimize=True)
json.dump([n for n,_ in rows],open('/tmp/ui/icon_rows.json','w'))
# ---- layout.js ----
pct=lambda r:[round(r[0]/W*100,4),round(r[1]/H*100,4),round(r[2]/W*100,4),round(r[3]/H*100,4)]
def conv(o): return {k:conv(v) for k,v in o.items()} if isinstance(o,dict) else ([conv(v) for v in o] if isinstance(o,list) and o and isinstance(o[0],list) else (pct(o) if isinstance(o,list) else o))
open(OUT+'src/layout.js','w',encoding='utf-8').write('// Sinh tự động bởi tools/build_ui.py. Mỗi hình chữ nhật: [trái, trên, rộng, cao] theo % của bảng giao diện 16:9\nexport const ICON_ROWS = '+json.dumps([n for n,_ in rows])+';\nexport const LAYOUT = '+json.dumps(conv(L))+';\n')
# ---- ảnh kiểm tra căn chỉnh ----
ov=Image.fromarray(np.clip(board,0,255).astype(np.uint8)).resize((1456,819)); d=ImageDraw.Draw(ov); s=1456/W
def box(r,c): d.rectangle([r[0]*s,r[1]*s,(r[0]+r[2])*s,(r[1]+r[3])*s],outline=c)
for k_,v in L.items():
    if k_=='eslots':
        for r in v.values(): box(r,(0,255,0))
    elif isinstance(v,list) and v and isinstance(v[0],list):
        for r in v: box(r,(255,255,0) if k_ in('igrid',) else (0,200,255))
    elif isinstance(v,list): box(v,(255,0,255))
ov.save('/tmp/ui/overlay.png'); print('ok',len(L))
