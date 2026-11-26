# Dựng tài nguyên địa hình từ 2 bảng gạch: (1) texture nền liền mạch cho từng loại địa hình x 5 chủ đề màu, (2) sprite vật thể (vách đá, bụi, ao, cầu, hàng rào), (3) bụi cỏ vẽ tay để lay động
from paths import ROOT, WORK, SRC as SRC_DIR, work, need
import numpy as np, json, os, random
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.color import rgb2hsv, hsv2rgb
U=SRC_DIR; NT=work('nt'); OUT=ROOT+'assets/terrain/'
A=Image.open(U+'Bản_đồ_gạch_địa_hình_pixel_phong_phú__1_.png').convert('RGB'); B=Image.open(U+'Bộ_gạch_địa_hình_pixel_xanh_mát__1_.png').convert('RGB')
comps=json.load(open(NT+'comps.json'))
# ---------- 1) cắt sprite vật thể ----------
for k,src in (('A',Image.open(U+'Bản_đồ_gạch_địa_hình_pixel_phong_phú__1_.png').convert('RGBA')),('B',Image.open(U+'Bộ_gạch_địa_hình_pixel_xanh_mát__1_.png').convert('RGBA'))):
    fg=np.load(NT+f'fg_{k}.npy'); os.makedirs(NT+'t'+k,exist_ok=True)
    for j,c in enumerate(comps[k]):
        a=np.array(src.crop(tuple(c))); a[...,3]=np.where(fg[c[1]:c[3],c[0]:c[2]],255,0); Image.fromarray(a).save(NT+f't{k}/{j:03d}.png')
br=Image.open(NT+'tB/020.png'); br.rotate(90,expand=True).save(NT+'tB/100.png')   # cầu dọc (qua sông chảy ngang)
# ---------- 2) bụi cỏ vẽ tay: các lá cong thon dần, 3 tầng màu (viền tối / thân / vệt sáng) ----------
os.makedirs(NT+'tT',exist_ok=True); rnd=random.Random(11)
PALG=[(32,96,24),(66,156,40),(120,208,62)]
def blade(d,bx,base,lean,h,wd,col):
    L_=[];R_=[]
    for k in range(15):
        t=k/14; x=bx+lean*(t**1.7); y=base-h*t; w=max(0.5,wd*(1-t)**0.8); L_.append((x-w,y)); R_.append((x+w,y))
    d.polygon(L_+R_[::-1],fill=col+(255,))
for i,(w,h,nb,hh) in enumerate([(36,28,13,24),(44,34,15,30),(38,42,12,37),(32,24,10,20),(48,36,16,32),(36,30,12,26)]):
    S=8; im=Image.new('RGBA',((w+8)*S,(h+4)*S),(0,0,0,0)); d=ImageDraw.Draw(im); base=(h+2)*S
    bl=[(rnd.uniform(.2,.8)*w*S+4*S,rnd.uniform(-.5,.5)*w*S*.55,rnd.uniform(.6,1.0)*hh*S,rnd.uniform(1.7,2.5)*S) for _ in range(nb)]
    bl.sort(key=lambda b:b[2])
    for bx,lean,hh_,wd in bl: blade(d,bx,base,lean,hh_,wd*1.55,PALG[0])
    for bx,lean,hh_,wd in bl: blade(d,bx,base-0.5*S,lean*0.98,hh_*0.97,wd*1.05,PALG[1])
    for bx,lean,hh_,wd in bl[::2]: blade(d,bx-0.35*S,base-1.2*S,lean*0.95,hh_*0.9,wd*0.38,PALG[2])
    im=im.resize((w+8,h+4),Image.LANCZOS); a=np.array(im); a[...,3]=np.where(a[...,3]>120,255,0); im=Image.fromarray(a); bb=im.getbbox(); im.crop(bb).save(NT+f'tT/{i:03d}.png')
# ---------- 3) texture nền liền mạch ----------
def crop(img,x0,y0,x1,y1,inset=18): return np.array(img.crop((x0+inset,y0+inset,x1-inset,y1-inset)))
cols=[(10,192),(200,380),(388,565),(575,752),(763,940),(950,1130),(1140,1325),(1335,1525)]
R1=lambda c:crop(B,cols[c][0],12,cols[c][1],190); R2=lambda c:crop(B,cols[c][0],203,cols[c][1],362)
def atile(i,inset=16):
    c=comps['A'][i]; return np.array(A.crop((c[0]+inset,c[1]+inset,c[2]-inset,c[3]-inset)))
SRC={'grass':[R1(0),atile(2,20)],'meadow':[R2(0),R2(1),atile(1),atile(4)],'dirt':[R1(4),atile(7,24)],'sand':[R1(5),atile(10),atile(11)],'stone':[R1(6),atile(14)],'water':[R1(7),atile(18),atile(19)]}
def synth(srcs,size=1024,patch=130,feather=52,n=300,seed=1):
    rnd=np.random.default_rng(seed); cv=np.zeros((size,size,3),np.float32)
    def ramp_of(p): r=np.minimum(np.minimum(np.arange(p),np.arange(p)[::-1])/feather,1.0); r=r*r*(3-2*r); return np.outer(r,r)[...,None].astype(np.float32)
    def put(a_full):
        s_=srcs[rnd.integers(len(srcs))]; h,w=s_.shape[:2]; p=min(patch,h,w)
        y=rnd.integers(0,h-p+1); x=rnd.integers(0,w-p+1); pt=s_[y:y+p,x:x+p].astype(np.float32)
        if rnd.random()<.5: pt=pt[:,::-1]
        if rnd.random()<.5: pt=pt[::-1]
        ys=(np.arange(p)+oy)%size; xs=(np.arange(p)+ox)%size; a=1.0 if a_full else ramp_of(p)
        cv[np.ix_(ys,xs)]=cv[np.ix_(ys,xs)]*(1-a)+pt*a
    step=min(patch,*(min(x.shape[:2]) for x in srcs))-18   # bước nhỏ hơn mảnh nhỏ nhất => phủ kín, không còn khe đen
    for gy in range(-step,size,step):          # lượt 1: phủ kín lưới (có vòng quanh) để không còn lỗ trống
        for gx in range(-step,size,step): ox=gx+int(rnd.integers(-8,9)); oy=gy+int(rnd.integers(-8,9)); put(True)
    for k in range(n):                          # lượt 2: pha mềm các đường ghép
        ox=int(rnd.integers(size)); oy=int(rnd.integers(size)); put(False)
    return Image.fromarray(np.clip(cv,0,255).astype(np.uint8)).resize((512,512),Image.LANCZOS)
BASE={k:synth(v,seed=7+i) for i,(k,v) in enumerate(SRC.items())}
def grade(im,hue=0,sat=1,val=1,sel=None,tint=None,tmix=0):
    a=np.array(im.convert('RGB')).astype(float)/255; h=rgb2hsv(a); deg=h[...,0]*360
    w=np.ones_like(deg) if sel is None else ((deg>=sel[0])&(deg<=sel[1])&(h[...,1]>.12)).astype(float)
    h[...,0]=((deg+hue*w)%360)/360; h[...,1]=np.clip(h[...,1]*(1+(sat-1)*w),0,1); h[...,2]=np.clip(h[...,2]*(1+(val-1)*w),0,1); o=hsv2rgb(h)
    if tint is not None: lum=o.mean(axis=2,keepdims=True); o=o*(1-tmix)+np.clip(np.array(tint)/255*lum*2,0,1)*tmix
    return Image.fromarray((np.clip(o,0,1)*255).astype(np.uint8))
G={'forest':{'green':dict(sat=.74,val=.92),'earth':dict(sat=.9,val=.97)},
 'cave':{'green':dict(sat=.25,val=.72,tint=(100,115,140),tmix=.32),'earth':dict(sat=.3,val=.78,tint=(110,120,145),tmix=.3),'stone':dict(sat=.5,val=.8,tint=(100,115,150),tmix=.2),'water':dict(hue=15,sat=.6,val=.55,sel=(160,260)),'shallow':dict(hue=10,sat=.4,val=.85,sel=(140,260))},
 'volcano':{'green':dict(hue=-70,sat=.55,val=.58,tint=(150,75,40),tmix=.35),'earth':dict(sat=.7,val=.55,tint=(170,60,30),tmix=.4),'stone':dict(sat=.5,val=.55,tint=(140,50,30),tmix=.4),'water':dict(hue=175,sat=1.3,val=1.3,sel=(170,260)),'shallow':dict(hue=215,sat=1.05,val=1.5,sel=(140,260))},
 'ice':{'green':dict(sat=.12,val=1.2,tint=(205,228,255),tmix=.45),'earth':dict(sat=.12,val=1.08,tint=(175,205,232),tmix=.4),'stone':dict(sat=.3,val=1.1,tint=(170,205,245),tmix=.35),'water':dict(sat=.45,val=1.3,sel=(160,260)),'shallow':dict(sat=.3,val=1.4,sel=(140,260))},
 'dark':{'green':dict(hue=170,sat=.75,val=.62,sel=(50,170),tint=(80,50,125),tmix=.3),'earth':dict(sat=.3,val=.55,tint=(85,65,115),tmix=.35),'stone':dict(sat=.4,val=.6,tint=(100,60,140),tmix=.35),'water':dict(hue=62,sat=.6,val=.55,sel=(160,260)),'shallow':dict(hue=55,sat=.45,val=.78,sel=(140,260))}}
KIND={'grass':'green','meadow':'green','dirt':'earth','sand':'earth','stone':'stone','water':'water'}
SH=grade(BASE['water'],hue=-24,sat=.85,val=1.18,sel=(170,260)); BASE['shallow']=Image.blend(SH,BASE['sand'],.07)   # nước nông xanh ngọc, pha cát
KIND['shallow']='shallow'
for th,fx in G.items():
    for name,im in BASE.items():
        f=fx.get(KIND[name],{}); out=grade(im,**f) if f else im
        out.save(f'{OUT}{th}_{name}.jpg',quality=84)
print('terrain done',len(os.listdir(OUT)))
for nm in ('grass','meadow','dirt','sand','stone','water','shallow'):
    pass
sheet=Image.new('RGB',(256*7,256),(0,0,0))
for k,nm in enumerate(('grass','meadow','dirt','sand','stone','water','shallow')): sheet.paste(Image.open(f'{OUT}forest_{nm}.jpg').resize((256,256)),(k*256,0))
sheet.save(NT+'terrain_preview.png')
