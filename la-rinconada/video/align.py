# Aligne chaque phrase du script sur les pauses détectées dans voix.mp3 -> timings.json
import re,json,subprocess
import numpy as np, wave

s=open('../script.md').read()
scenes=[(m.group(1),m.group(2).strip()) for m in re.finditer(r'\*\*\[(.+?)\]\*\*\n(.+)',s)]
sents=[]
for i,(n,t) in enumerate(scenes):
    for x in re.split(r'(?<=[.?!…])\s+(?=[A-ZÀ-Ý])',t): sents.append([i,x])
def syl(x):
    x=x.lower().replace('5 100','cinq mille cent').replace('30 000','trente mille')
    x=re.sub(r"e\b",'',x)
    return max(1,len(re.findall(r'[aeiouyàâéèêëîïôûùœ]+',x)))
out=WAV='/tmp/claude-0/-home-user-video-ia/8c801a30-8e95-511e-9fda-9ff82e456362/scratchpad/v.wav'
subprocess.run(f'ffmpeg -v error -y -i voix.mp3 -ac 1 -ar 16000 {WAV}',shell=True)
out=subprocess.run("ffmpeg -hide_banner -i voix.mp3 -af silencedetect=n=-40dB:d=0.12 -f null -",shell=True,capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]
en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
dur=float(re.search(r'Duration: (\d+):(\d+):([\d.]+)',out).group(3))+60*int(re.search(r'Duration: (\d+):(\d+)',out).group(2))
P=[(a,b) for a,b in zip(st,en)]
w=wave.open(WAV); x=np.frombuffer(w.readframes(w.getnframes()),np.int16)/32768
hop=160; n=len(x)//hop
e=np.sqrt(np.mean(x[:n*hop].reshape(n,hop)**2,axis=1)); db=20*np.log10(e+1e-6)
kk=np.hanning(9); kk/=kk.sum(); sm=np.convolve(db,kk,'same')
peaks=[i*0.01 for i in range(2,n-2) if sm[i]>sm[i-1] and sm[i]>=sm[i+1] and sm[i]>-35 and sm[i]-max(sm[max(0,i-12):i].min(),sm[i+1:i+13].min())>2.0]
def npk(a,b): return sum(1 for p in peaks if a<=p<b)
N=len(sents); M=len(P); sy=[syl(x) for _,x in sents]
start0=0.0; end0=dur
k=(end0-start0-0)/sum(sy)
INF=1e18
k=(dur-sum(b-a for a,b in P if b-a>0.25))/sum(sy)
def cost(t0,t1,i):
    return (npk(t0,t1)-sy[i])**2/sy[i] + ((t1-t0)-k*sy[i])**2/(0.15*k*sy[i])
# dp[i][j]: phrases 0..i-1 placées, la frontière i-1/i est la pause j-1 (j=0 -> début)
import functools
@functools.lru_cache(None)
def f(i,j):
    # phrase i commence après la pause j-1 (ou au début si j==0)
    t0=P[j-1][1] if j>0 else 0.0
    if i==N-1: return cost(t0,end0,i),()
    best=(INF,())
    for jj in range(j,M):
        t1=P[jj][0]
        c=cost(t0,t1,i) - 3*(P[jj][1]-P[jj][0])
        if t1-t0>3*k*sy[i]+1: break
        r,path=f(i+1,jj+1)
        if c+r<best[0]: best=(c+r,(jj,)+path)
    return best
cost,path=f(0,0)
res=[]
for i,(sc,x) in enumerate(sents):
    t0=P[path[i-1]][1]-0.05 if i>0 else 0.0
    t1=P[path[i]][0]+0.1 if i<N-1 else dur
    res.append({'scene':sc,'text':x,'start':round(t0,2),'end':round(t1,2)})
json.dump({'duration':dur,'sentences':res},open('timings.json','w'),ensure_ascii=False,indent=1)
for r in res: print(r['scene'],r['start'],r['end'],r['text'])
