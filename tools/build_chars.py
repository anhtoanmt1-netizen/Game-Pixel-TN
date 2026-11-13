# Tách sprite 4 lớp nhân vật từ bảng ảnh: chuẩn hóa tỉ lệ + căn chân, xuất atlas theo lớp + ảnh chân dung + src/chars.js
import numpy as np, json
from PIL import Image
from scipy import ndimage as ndi
SRC='/mnt/user-data/uploads/Bảng_sprite_RPG_bốn_lớp_nhân_vật__1_.png'; OUT='/home/claude/ETERNAL-PIXEL/'
im=Image.open(SRC).convert('RGBA'); A=np.array(im.getchannel('A')); fg=A>60
lab,n=ndi.label(ndi.binary_dilation(fg,iterations=5)); comps=[]
for i,sl in enumerate(ndi.find_objects(lab),1):
    m=(lab[sl]==i)&fg[sl]
    if m.sum()<2000: continue
    ys,xs=np.where(m); c=[sl[1].start+xs.min(),sl[0].start+ys.min(),sl[1].start+xs.max()+1,sl[0].start+ys.max()+1]
    if c[3]-c[1]<60: continue            # mũi tên rời
    comps.append(c)
CLS=['mage','knight','elf','rogue']; XR=[(0,1250),(1250,2400),(2400,3400),(3400,9999)]
def pick(ci,y0,y1): x0,x1=XR[ci]; return sorted([c for c in comps if x0<=c[0]<x1 and y0<=(c[1]+c[3])/2<y1],key=lambda c:c[0])
CW,CH,FX,FY=200,144,100,136; META={}
for ci,cls in enumerate(CLS):
    port=pick(ci,0,1040); rowA=pick(ci,1040,1400); rowC=pick(ci,1750,2110); rowD=pick(ci,2110,2520)
    assert len(port)==1 and len(rowA)==4,(cls,len(port),len(rowA)); 
    s=84.0/(rowA[0][3]-rowA[0][1])                       # cùng 1 hệ số cho mọi khung của lớp: nhân vật cao ~84px
    frames={}
    def add(name,c):
        cr=im.crop(tuple(c)); cr=cr.resize((max(1,round(cr.width*s)),max(1,round(cr.height*s))),Image.LANCZOS)
        a=np.array(cr.getchannel('A'))>128; h=a.shape[0]; ys,xs=np.where(a[int(h*.35):int(h*.85)]); cx=int(np.median(xs)) if len(xs) else cr.width//2
        cell=Image.new('RGBA',(CW,CH),(0,0,0,0)); cell.paste(cr,(FX-cx,FY-cr.height),cr); frames[name]=cell
    add('down',rowA[0]); add('left',rowA[1]); add('up',rowA[2])
    if cls=='mage':
        for k,c in enumerate(rowC): add(f'i{k}',c)
        for k,c in enumerate(rowD): add(f'a{k}',c)
        META[cls]={'idle':['i0','i1','i2','i3'],'atk':['a0','a1'],'skl':['a2','a3'],'face':{'atk':'right','skl':'right'}}
    else:
        for k,c in enumerate(rowC): add(f'a{k}',c)
        for k,c in enumerate(rowD): add(f's{k}',c)
        META[cls]={'idle':['down'],'atk':[f'a{k}' for k in range(len(rowC))],'skl':[f's{k}' for k in range(len(rowD))],
                   'face':{'atk':{'knight':'left','elf':'right','rogue':'left'}[cls],'skl':'right'}}
    names=list(frames); cols=4; rows=(len(names)+cols-1)//cols; atlas=Image.new('RGBA',(cols*CW,rows*CH),(0,0,0,0)); fr={}
    for k,nm in enumerate(names):
        x,y=(k%cols)*CW,(k//cols)*CH; atlas.paste(frames[nm],(x,y))
        fr[nm]={'frame':{'x':x,'y':y,'w':CW,'h':CH},'spriteSourceSize':{'x':0,'y':0,'w':CW,'h':CH},'sourceSize':{'w':CW,'h':CH}}
    atlas.save(f'{OUT}assets/chars/{cls}.png',optimize=True)
    json.dump({'frames':fr,'meta':{'image':cls+'.png','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},open(f'{OUT}assets/chars/{cls}.json','w'))
    p=im.crop(tuple(port[0])); p=p.resize((round(p.width*560/p.height),560),Image.LANCZOS); p.save(f'{OUT}assets/chars/{cls}_portrait.png',optimize=True)
    print(cls,len(frames),'frames s=%.3f'%s)
open(OUT+'src/chars.js','w',encoding='utf-8').write('// Sinh tự động bởi tools/build_chars.py. Khung hình mỗi lớp trong assets/chars/<lớp>.png\nexport const CELL = ['+str(CW)+', '+str(CH)+'], FEET = ['+str(FX)+', '+str(FY)+'];\nexport const CHARS = '+json.dumps(META)+';\n')
# xem trước: lưới khung hình
sheet=Image.new('RGBA',(CW*8,CH*4),(70,70,80,255))
for r,cls in enumerate(CLS):
    a=Image.open(f'{OUT}assets/chars/{cls}.png'); js=json.load(open(f'{OUT}assets/chars/{cls}.json'))['frames']
    for k,(nm,f) in enumerate(js.items()):
        fx=f['frame']; sheet.alpha_composite(a.crop((fx['x'],fx['y'],fx['x']+CW,fx['y']+CH)),(k*CW,r*CH))
sheet.convert('RGB').save('/tmp/ch/frames_preview.png')
