import numpy as np, json, os
from PIL import Image
from scipy import ndimage as ndi
from skimage.color import rgb2hsv, hsv2rgb
EX='/tmp/ex/'; OUT='/home/claude/ETERNAL-PIXEL/assets/'
comps=json.load(open(EX+'comps.json'))
def load(src,i):
    im=Image.open(f'{EX}{src}/{i:03d}.png').convert('RGBA'); a=np.array(im)
    m=ndi.binary_erosion(a[...,3]>0,iterations=1)            # bỏ viền trắng do JPEG/khử nền
    a[...,3]=np.where(m,255,0); ys,xs=np.where(m)
    return Image.fromarray(a[ys.min():ys.max()+1,xs.min():xs.max()+1])
def fit(im,h=None,w=None,s=None):
    s=s or ((h/im.height) if h else (w/im.width))
    if abs(s-1)<.05: return im
    nw,nh=max(1,round(im.width*s)),max(1,round(im.height*s))
    if s>=1.9: k=round(s); return im.resize((im.width*k,im.height*k),Image.NEAREST)
    return im.resize((nw,nh),Image.LANCZOS)
def grade(im,hue=0,sat=1,val=1,sel=None,tint=None,tmix=0):
    a=np.array(im).astype(float)/255; rgb=a[...,:3]; al=a[...,3]
    h=rgb2hsv(rgb); deg=h[...,0]*360
    w=np.ones_like(deg) if sel is None else ((deg>=sel[0])&(deg<=sel[1])&(h[...,1]>.12)).astype(float)
    h[...,0]=((deg+hue*w)%360)/360; h[...,1]=np.clip(h[...,1]*(1+(sat-1)*w),0,1); h[...,2]=np.clip(h[...,2]*(1+(val-1)*w),0,1)
    out=hsv2rgb(h)
    if tint is not None:
        lum=out.mean(axis=2,keepdims=True); t=np.clip(np.array(tint)/255*lum*2,0,1); out=out*(1-tmix)+t*tmix
    return Image.fromarray(np.dstack([np.clip(out,0,1),al]).__mul__(255).astype(np.uint8))
# ---- hiệu chỉnh màu theo chủ đề (đồng bộ bảng màu của từng khu vực)
FX={
 'forest':{},
 'cave':{'ground':dict(sat=.35,val=.74,tint=(96,112,150),tmix=.3),'path':dict(sat=.3,val=.78,tint=(112,122,155),tmix=.28),
   'rock':dict(sat=.6,val=.82,tint=(100,115,150),tmix=.2),'plant':dict(hue=45,sat=.5,val=.8,sel=(50,170)),
   'pool':dict(hue=15,sat=.8,val=.6,sel=(160,260)),'mush':dict(sat=1.1,val=.95),'tree':dict(val=.85),'crystal':{}},
 'volcano':{'ground':dict(sat=.7,val=.55,tint=(175,55,28),tmix=.42),'path':dict(sat=.6,val=.5,tint=(150,50,25),tmix=.38),
   'rock':dict(sat=.5,val=.55,tint=(140,50,30),tmix=.4),'tree':dict(sat=.1,val=.45,tint=(110,45,25),tmix=.35),
   'plant':dict(hue=-80,sat=1.1,val=.8,sel=(50,170)),'pool':dict(hue=175,sat=1.3,val=1.35,sel=(170,260)),'mush':dict(hue=-100,sat=1,val=.9),'crystal':{}},
 'ice':{'ground':dict(sat=.1,val=1.25,tint=(205,228,255),tmix=.45),'path':dict(sat=.12,val=1.05,tint=(170,200,230),tmix=.4),
   'rock':dict(sat=.3,val=1.1,tint=(170,205,245),tmix=.35),'tree':dict(sat=.35,val=1.1,tint=(200,225,255),tmix=.3),
   'plant':dict(sat=.35,val=1.15,tint=(210,235,255),tmix=.35),'pool':dict(sat=.45,val=1.3,sel=(160,260)),'mush':dict(sat=.6,val=1.1),'crystal':dict(val=1.1)},
 'dark':{'ground':dict(hue=60,sat=.6,val=.62,tint=(80,50,125),tmix=.4),'path':dict(sat=.35,val=.66,tint=(95,70,130),tmix=.35),
   'rock':dict(sat=.4,val=.6,tint=(100,60,140),tmix=.35),'tree':dict(sat=.35,val=.55,tint=(90,50,130),tmix=.35),
   'plant':dict(hue=170,sat=.8,val=.7,sel=(50,170)),'pool':dict(hue=85,sat=.8,val=.6,sel=(160,260)),'mush':dict(hue=40,sat=.9,val=.85),'crystal':dict(val=1.05)},
}
GK={'tree':'tree','stump':'tree','log':'tree','rock':'rock','bush':'plant','deco':'plant','mush':'mush','crystal':'crystal','pool':'pool'}
mush=[i for i,c in enumerate(comps['mush']) if not (c['w']>110 and c['h']<=50)]
LOGS=list(range(25)); IB=list(range(12,30)); BUSH=list(range(40))
SMALL_ISO=[43,46,48,56,57,47,49,51,52,54]
FLOW=[36,37,38,40,42,43,44,45,47,48,49]; TUFT=[93,94,95,28,29,61,62,63,104]; LEAF=[90,91,92,102]; PEBBLE=[101,105,107,10]
BONES=[79,88,89,87]
def R(*xs): return [(s,i) for s,l in xs for i in l]
SPEC={
 'forest':dict(tree=R(('iso',[0,2,6,9,10,7,1,4]),('nature',[24])),rock=R(('iso',[30,31,32,33,34,35,36]),('nature',[1,2,4,6])),log=R(('logs',[0,3,6])),stump=R(('iso',[37])),bush=R(('nature',[30,31,32,33])),deco=R(('nature',FLOW)),mush=R(('mush',mush[:20])),pool=R(('nature',[58,60,53])),crystal=[]),
 'cave':dict(tree=[],rock=R(('iso',[30,31,32,33,34,35,36]),('nature',[1,2,3,4,6,8])),log=[],stump=[],bush=[],deco=R(('nature',[87,88,79])),mush=R(('mush',mush[:24])),pool=R(('nature',[58,60])),crystal=R(('nature',[77,78,80,82,84]))),
 'volcano':dict(tree=R(('nature',[26,26,26,56])),rock=R(('iso',[30,31,32,33,34,35,36]),('nature',[5,7,8,9])),log=[],stump=[],bush=[],deco=R(('nature',[87,88,79,85])),mush=[],pool=R(('nature',[58,60,53])),crystal=R(('nature',[80,82]))),
 'ice':dict(tree=R(('iso',[1,5,0,2,6]),('nature',[24])),rock=R(('iso',[30,31,32,33,34,35,36]),('nature',[1,2,4,6])),log=[],stump=R(('iso',[37])),bush=R(('nature',[31,32])),deco=[],mush=R(('mush',mush[:8])),pool=R(('nature',[58,60,53])),crystal=R(('nature',[84,77]))),
 'dark':dict(tree=R(('nature',[26,26,56]),('iso',[4,5,9])),rock=R(('iso',[30,31,32,33,34,35,36]),('nature',[1,2,3,6])),log=[],stump=[],bush=[],deco=R(('nature',[87,88,79])),mush=R(('mush',mush[:24]),('nature',[68])),pool=R(('nature',[58,60])),crystal=R(('nature',[77,78]))),
}
HEIGHT={'tree':104,'bush':None,'deco':None}
SCALE={'iso_rock':.72,'iso_bush':.6,'logw':64,'tree_h':104}
def strip_base(im):
    a=np.array(im).copy(); h=a.shape[0]; y0=int(h*0.72); hsv=rgb2hsv(a[...,:3]/255.); hue=hsv[...,0]*360
    kill=np.zeros(a.shape[:2],bool); kill[y0:]=((hue>55)&(hue<170)&(hsv[...,1]>0.22))[y0:]&(a[...,3]>0)[y0:]
    a[...,3]=np.where(kill,0,a[...,3]); al=a[...,3]>0; lab,n=ndi.label(al); sizes=ndi.sum(al,lab,range(1,n+1))
    keep=np.isin(lab,[i+1 for i,s_ in enumerate(sizes) if s_>=0.04*al.sum()]); a[...,3]=np.where(keep,a[...,3],0)
    ys,xs=np.where(a[...,3]>0); return Image.fromarray(a[ys.min():ys.max()+1,xs.min():xs.max()+1])
def prep(theme,cat,src,i):
    im=load(src,i)
    if src=='iso' and cat in ('tree','rock','stump'): im=strip_base(im)
    if cat=='tree': im=fit(im,h=104 if src=='iso' else 100) if src=='iso' else fit(im,h=96 if im.height<80 else 80)
    elif cat=='rock': im=fit(im,s=.72 if src=='iso' else 1.0)
    elif cat=='log': im=fit(im,w=64)
    elif cat=='stump': im=fit(im,h=44)
    elif cat=='bush': im=fit(im,s=.62 if src=='iso' else 1.0)
    elif cat=='deco': im=fit(im,s=.8 if src=='iso' else (.9 if src=='nature' and im.height>30 else 1.0))
    elif cat=='mush': im=fit(im,s=.85)
    elif cat=='pool': im=im.resize((im.width*2,im.height*2),Image.LANCZOS)
    elif cat=='crystal': im=fit(im,h=46)
    fx=FX[theme].get(GK[cat],{})
    return grade(im,**fx) if fx else im
import random
def tiles(theme,groups,cat,seed):
    rnd=random.Random(seed); out=[]
    srcs={}
    for g in groups:
        for i in g:
            t=np.array(Image.open(f'{EX}nature/{i:03d}.png').convert('RGB')); h,w,_=t.shape; srcs[i]=t[6:h-6,6:w-6]
    def patch(g):
        t=srcs[rnd.choice(g)]; ih,iw=t.shape[:2]; q=min(24,ih,iw); y=rnd.randint(0,ih-q); x=rnd.randint(0,iw-q)
        c=t[y:y+q,x:x+q]
        if q!=24: c=np.array(Image.fromarray(c).resize((24,24),Image.NEAREST))
        if rnd.random()<.5: c=c[:,::-1]
        if rnd.random()<.5: c=c[::-1]
        return c
    for g,count in groups_counts(groups,cat):
        for _ in range(count):
            full=np.concatenate([np.concatenate([patch(g),patch(g)],axis=1),np.concatenate([patch(g),patch(g)],axis=1)],axis=0)
            im=Image.fromarray(np.ascontiguousarray(full)).convert('RGBA'); fx=FX[theme].get(cat,{})
            out.append(grade(im,**fx) if fx else im)
    return out
def groups_counts(groups,cat):
    return [(g,c) for g,c in zip(groups,(4,2,2) if cat=='ground' else (6,))]
GROUND={'forest':[[12,13],[16],[22]],'cave':[[20,21],[17],[15]],'volcano':[[20,21],[19],[17]],'ice':[[12,13],[22],[16]],'dark':[[12,13],[20],[22]]}
PATH={'forest':[[14,15,18]],'cave':[[15,17,21]],'volcano':[[14,18,15]],'ice':[[14,21,19]],'dark':[[17,15,21]]}
def pack(frames,theme):
    items=sorted(frames.items(),key=lambda kv:-kv[1].height); W=1024; x=y=rh=0; pos={}
    for n,im in items:
        if x+im.width>W: x=0; y+=rh+1; rh=0
        pos[n]=(x,y); x+=im.width+1; rh=max(rh,im.height)
    H=y+rh+1; atlas=Image.new('RGBA',(W,H),(0,0,0,0))
    for n,im in frames.items(): atlas.paste(im,pos[n])
    atlas.save(f'{OUT}{theme}.png',optimize=True)
    json.dump({'frames':{n:{'frame':{'x':pos[n][0],'y':pos[n][1],'w':im.width,'h':im.height},'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'sourceSize':{'w':im.width,'h':im.height}} for n,im in frames.items()},'meta':{'image':theme+'.png','size':{'w':W,'h':H},'scale':'1'}},open(f'{OUT}{theme}.json','w'))
    return W,H
THEMES={}
for th in SPEC:
    frames={}; meta={}
    for cat in ['tree','rock','log','stump','bush','deco','mush','pool','crystal']:
        names=[]
        for k,(src,i) in enumerate(SPEC[th][cat]):
            im=prep(th,cat,src,i); n=f'{cat}_{k}'; frames[n]=im; names.append([n,im.width,im.height])
        meta[cat]=names
    THEMES[th]=meta; print(th,len(frames),pack(frames,th),{c:len(v) for c,v in meta.items()})
open('/home/claude/ETERNAL-PIXEL/src/themes.js','w',encoding='utf-8').write('// Sinh tự động bởi tools/build_assets.py từ các sheet ảnh môi trường. Mỗi mục: [tên frame, rộng, cao]\nexport const CELL = 48;\nexport const THEMES = '+json.dumps(THEMES,ensure_ascii=False)+';\n')
