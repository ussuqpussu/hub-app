var MY_BASE_ADAM=LY.adam;
/* ===== v36: тема «Мифы» (God of War, греческая и скандинавская мифология) ===== */
var MYV={gears:"myth/gears.mp4",splash:"myth/splash.mp4",vase:"myth/wheel.mp4",stars:"myth/sag.mp4",coins:"myth/crate.mp4",hourglass:"myth/hourglass.mp4",scroll:"myth/scroll.mp4"};
var MYW={gears:"myth/gears.webm",splash:"myth/splash.webm",vase:"myth/wheel.webm",stars:"myth/sag.webm",coins:"myth/crate.webm",hourglass:"myth/hourglass.webm",scroll:"myth/scroll.webm"};
var MYD={coins:14,stars:5,proj:62,days:3,notes:5,rage:70,ravens:7,lore:18,demo:true};
var MYPALS={
 base:{n:"Основная",b:"#050505",s:"#101010",t:"#d4d4d4",a:"#f2f2f2",ba:"#050505",asc:"#dcdcdc",r1:"#4a4d55",r2:"#9097a6"},
 nif:{n:"Нифльхейм",b:"#04080d",s:"#0b141d",t:"#cfe0ee",a:"#9fd0f5",ba:"#04080d",asc:"#a9d6f7",r1:"#3f5568",r2:"#9fc4e0"},
 mus:{n:"Муспельхейм",b:"#0b0504",s:"#1a0e0a",t:"#f0d9c8",a:"#ff9a52",ba:"#0b0504",asc:"#ffb27a",r1:"#5a3a2c",r2:"#d98a5a"},
 oly:{n:"Олимп",b:"#f1eee7",s:"#fbf9f4",t:"#2a2926",a:"#8a6a22",ba:"#ffffff",asc:"#34322d",r1:"#2a2a2f",r2:"#6a6d75"}};
var MYPAL="base";try{var _mp=localStorage.getItem("mythPal");if(_mp&&MYPALS[_mp])MYPAL=_mp}catch(e){}
var MYSTARS={"Каус Австралис":[393.1,340.6,1.79],"Нунки":[171.4,92.6,2.05],"Каус Медиа":[419.4,200.9,2.7],"Каус Бореалис":[371.9,65.7,2.82],"Аскелла":[124.2,202.5,2.6],"Альнасл":[525.9,219.1,2.99],"φ":[242.3,113.9,3.17],"τ":[88.7,134.7,3.32]};
var MYORD=["Каус Австралис","Нунки","Каус Медиа","Каус Бореалис","Аскелла","Альнасл","φ","τ"];
var MYLN=[["Каус Медиа","Каус Австралис"],["Каус Австралис","Аскелла"],["Аскелла","τ"],["τ","Нунки"],["Нунки","φ"],["φ","Каус Медиа"],["Каус Бореалис","Каус Медиа"],["Каус Бореалис","φ"],["Альнасл","Каус Медиа"],["Альнасл","Каус Австралис"]];
function mySm(x){x=Math.min(1,Math.max(0,x));return x*x*(3-2*x)}
function myRnd(i,k){var x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)}
var MYS={};
/* --- Итоги: монеты падают в ящик --- */
MYS.coins=function(c,S,t,dt,D){
 var N=Math.max(0,Math.min(20,Math.round(D.coins))),i;
 if(S.shown==null){S.shown=0;S.fall=[];S.sp=0;S.cyc=t;S.bt={}}
 if(D.demo&&t-S.cyc>19){S.shown=0;S.fall=[];S.cyc=t}
 if(S.shown>N)S.shown=N;S.fall=S.fall.filter(function(f){return f.i<N});
 S.sp-=dt;
 if(S.shown+S.fall.length<N&&S.sp<=0){S.fall.push({i:S.shown+S.fall.length,y:-40,v:0,r:myRnd(S.fall.length+S.shown,3)*6});S.sp=.2}
 var cx=320,fl=322,lay=function(k){return Math.floor(k/5)},col=function(k){return k%5};
 var cy=function(k){return fl-lay(k)*15-6},cxx=function(k){return cx+(col(k)-2)*84};
 S.fall.forEach(function(f){f.v+=1700*dt;f.y+=f.v*dt;f.r+=dt*9;var ty=cy(f.i);if(f.y>=ty&&f.i===S.shown){f.y=ty;f.done=1}});
 S.fall.filter(function(f){return f.done}).forEach(function(f){S.shown++;S.bt[f.i]=t});
 S.fall=S.fall.filter(function(f){return !f.done});
 // ящик, задняя стенка
 var g=c.createLinearGradient(0,150,0,340);g.addColorStop(0,"#222");g.addColorStop(1,"#4a4a4a");
 c.fillStyle=g;c.beginPath();c.moveTo(112,168);c.lineTo(528,168);c.lineTo(540,332);c.lineTo(100,332);c.closePath();c.fill();
 c.fillStyle="#303030";c.fillRect(100,326,440,8);
 var coin=function(x,y,rx,ry,b){
  var sg=c.createLinearGradient(x-rx,0,x+rx,0);sg.addColorStop(0,"rgba(120,120,120,"+b+")");sg.addColorStop(.35,"rgba(235,235,235,"+b+")");sg.addColorStop(1,"rgba(80,80,80,"+b+")");
  c.fillStyle=sg;c.fillRect(x-rx,y,2*rx,8);c.beginPath();c.ellipse(x,y+8,rx,ry,0,0,Math.PI);c.fill();
  var tg=c.createRadialGradient(x-rx*.3,y-ry*.3,1,x,y,rx);tg.addColorStop(0,"rgba(255,255,255,"+b+")");tg.addColorStop(1,"rgba(190,190,190,"+b+")");
  c.fillStyle=tg;c.beginPath();c.ellipse(x,y,rx,ry,0,0,6.2832);c.fill();
  c.strokeStyle="rgba(60,60,60,"+(.85*b)+")";c.lineWidth=2.4;c.beginPath();c.ellipse(x,y,rx*.62,ry*.62,0,0,6.2832);c.stroke()};
 for(i=0;i<S.shown;i++){var bump=S.bt[i]!=null?5*Math.exp(-(t-S.bt[i])*11)*Math.abs(Math.cos((t-S.bt[i])*28)):0;
  coin(cxx(i),cy(i)-bump,36,10,1);
  var gl=Math.max(0,Math.sin(t*1.8-i*.55)-.75)*4;if(gl>0){c.fillStyle="rgba(255,255,255,"+gl*.5+")";c.beginPath();c.ellipse(cxx(i)-10,cy(i)-2,11,3,0,0,6.2832);c.fill()}}
 S.fall.forEach(function(f){var rx=Math.max(4,36*Math.abs(Math.cos(f.r)));coin(cxx(f.i),f.y,rx,10*(.5+.5*Math.abs(Math.sin(f.r))),1)});
 // передняя стенка и стойки
 var fg=c.createLinearGradient(0,296,0,346);fg.addColorStop(0,"#757575");fg.addColorStop(1,"#4c4c4c");
 c.fillStyle=fg;c.fillRect(96,298,448,48);c.fillStyle="#9a9a9a";c.fillRect(96,298,448,4);c.fillStyle="#2c2c2c";c.fillRect(96,320,448,2);
 c.fillStyle="#8d8d8d";c.fillRect(92,150,22,200);c.fillRect(526,150,22,200);c.fillStyle="#b0b0b0";c.fillRect(92,150,22,4);c.fillRect(526,150,22,4)};
/* --- Задачи: созвездие Стрелец --- */
MYS.stars=function(c,S,t,dt,D){
 var n=Math.max(0,Math.min(8,Math.round(D.stars)));
 if(!S.lit){S.lit={};S.cyc=t}
 if(D.demo&&t-S.cyc>20){S.cyc=t;MYORD.forEach(function(k){S.lit[k]=0})}
 MYORD.forEach(function(k,i){var tg=i<n?1:0,v=S.lit[k]||0;var sp=dt*(tg>v?1.1:3);v=tg>v?Math.min(tg,v+sp):Math.max(tg,v-sp);S.lit[k]=v});
 var i;for(i=0;i<130;i++){var bx=myRnd(i,1)*640,by=myRnd(i,2)*400,tw=.18+.3*(.5+.5*Math.sin(t*(.6+myRnd(i,4))+i));c.fillStyle="rgba(255,255,255,"+tw+")";c.fillRect(bx,by,i%5?1.6:2.6,i%5?1.6:2.6)}
 MYLN.forEach(function(l){var a=MYSTARS[l[0]],b=MYSTARS[l[1]],la=S.lit[l[0]],lb=S.lit[l[1]],v=Math.min(la,lb);
  c.strokeStyle="rgba(255,255,255,"+(.09+.72*v)+")";c.lineWidth=v>.05?2.6:1.4;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()});
 MYORD.forEach(function(k){var p=MYSTARS[k],v=S.lit[k],r=4+(3.4-p[2])*2.6,fl=.8+.2*Math.sin(t*3+p[0]);
  var g=c.createRadialGradient(p[0],p[1],0,p[0],p[1],r*3.4*(.3+.7*v));g.addColorStop(0,"rgba(255,255,255,"+(.25+.75*v)*fl+")");g.addColorStop(1,"rgba(255,255,255,0)");
  c.fillStyle=g;c.beginPath();c.arc(p[0],p[1],r*3.4*(.3+.7*v)+1,0,6.2832);c.fill();
  if(v>.05){var L=(10+r*4.5)*v*fl;c.strokeStyle="rgba(255,255,255,"+.85*v+")";c.lineWidth=1.8;c.beginPath();c.moveTo(p[0]-L,p[1]);c.lineTo(p[0]+L,p[1]);c.moveTo(p[0],p[1]-L);c.lineTo(p[0],p[1]+L);c.stroke()}
  c.fillStyle="rgba(255,255,255,"+(.35+.65*v)+")";c.beginPath();c.arc(p[0],p[1],1.8+2.2*v,0,6.2832);c.fill()})};
/* --- Проекты: гончарный круг, комок глины -> амфора --- */
MYS.vase=function(c,S,t,dt,D){
 var p=Math.max(0,Math.min(1,D.proj/100));
 if(S.s==null)S.s=0;S.s+=(p-S.s)*Math.min(1,dt*2.2);var s=mySm(S.s);
 var cx=320,by=300,Hs=84+190*s,spin=t*2.4;
 var lump=function(u){return .35+.8*Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,u))),.55)};
 var K=[[0,.62],[.07,.7],[.22,1.05],[.42,1.22],[.62,1.0],[.8,.5],[.9,.48],[.96,.66],[1,.72]];
 var amph=function(u){for(var i=0;i<K.length-1;i++)if(u<=K[i+1][0]){var a=(u-K[i][0])/(K[i+1][0]-K[i][0]);a=a*a*(3-2*a);return K[i][1]*(1-a)+K[i+1][1]*a}return .72};
 var rad=function(u){return((1-s)*lump(u)+s*amph(u))*80};
 // круг
 var wg=c.createLinearGradient(0,by,0,by+50);wg.addColorStop(0,"#bdbdbd");wg.addColorStop(1,"#5a5a5a");
 c.fillStyle="#555";c.fillRect(cx-22,by+20,44,86);
 var fg=c.createLinearGradient(cx-210,0,cx+210,0);fg.addColorStop(0,"#303030");fg.addColorStop(.4,"#8a8a8a");fg.addColorStop(1,"#3a3a3a");
 c.fillStyle=fg;c.beginPath();c.ellipse(cx,by+112,215,36,0,0,6.2832);c.fill();c.strokeStyle="#d0d0d0";c.lineWidth=3;c.stroke();
 c.strokeStyle="rgba(30,30,30,.9)";c.lineWidth=7;for(var k=0;k<8;k++){var a=spin*1.2+k*Math.PI/4;c.beginPath();c.moveTo(cx+Math.cos(a)*40,by+112+Math.sin(a)*7);c.lineTo(cx+Math.cos(a)*190,by+112+Math.sin(a)*33);c.stroke()}
 c.fillStyle=wg;c.beginPath();c.ellipse(cx,by+8,165,38,0,0,6.2832);c.fill();c.fillRect(cx-165,by+8,330,10);c.beginPath();c.ellipse(cx,by+18,165,38,0,0,Math.PI);c.fill();
 c.fillStyle="#ddd";c.beginPath();c.ellipse(cx,by+4,165,38,0,0,6.2832);c.fill();
 c.strokeStyle="rgba(40,40,40,.75)";c.lineWidth=3;for(k=0;k<6;k++){a=spin+k*Math.PI/3;c.beginPath();c.moveTo(cx,by+4);c.lineTo(cx+Math.cos(a)*150,by+4+Math.sin(a)*34);c.stroke()}
 // глина (попиксельно)
 if(!S.tc){S.tc=document.createElement("canvas");S.tc.width=260;S.tc.height=300;S.id=S.tc.getContext("2d").createImageData(260,300)}
 var d=S.id.data,i2;for(i2=0;i2<d.length;i2++)d[i2]=0;
 var top=by-Hs,x0=cx-130,yy,xx;
 for(yy=Math.max(0,Math.floor(top)-2);yy<by+2&&yy<300+0;yy++){var u=(by-yy)/Hs;if(u<0||u>1)continue;var r=rad(u);if(r<1)continue;
  for(xx=Math.floor(cx-r);xx<=cx+r;xx++){var nx=(xx-cx)/r;if(nx<-1||nx>1)continue;var th=Math.asin(nx),nz=Math.cos(th);
   var lam=Math.max(0,-nx*.5+nz*.8)+.14;var gr=.9+.1*Math.sin(5*(th+spin)+16*u);var tone=Math.min(1,lam*gr*1.05);
   var px=xx-x0;if(px<0||px>=260)continue;var o=(yy*260+px)*4,v=Math.round(tone*255);d[o]=v;d[o+1]=v;d[o+2]=v;d[o+3]=255}}
 S.tc.getContext("2d").putImageData(S.id,0,0);c.drawImage(S.tc,x0,0);
 var rt=rad(1);
 if(s<.55){c.fillStyle="rgba(235,235,235,"+(1-s*1.2)+")";c.beginPath();c.ellipse(cx,top,rt,rt*.25,0,0,6.2832);c.fill()}
 else{c.fillStyle="#111";c.beginPath();c.ellipse(cx,top,rt,rt*.25,0,0,6.2832);c.fill();c.strokeStyle="rgba(255,255,255,.95)";c.lineWidth=4;c.stroke()}
 // ручки
 var hs=mySm((s-.72)/.22);
 if(hs>.02){[0,Math.PI].forEach(function(ph){var pts=[],j;for(j=0;j<=14;j++){var q=j/14,u2=.8-q*.28,out=rad(u2)+hs*42*Math.sin(Math.PI*q)*.95,phi=spin+ph;pts.push([cx+out*Math.sin(phi),by-u2*Hs,Math.cos(phi)])}
   c.lineWidth=9;c.lineCap="round";for(j=0;j<pts.length-1;j++){var z=pts[j][2],b=Math.max(.18,.4+.6*z);c.strokeStyle="rgba(255,255,255,"+b*hs+")";c.beginPath();c.moveTo(pts[j][0],pts[j][1]);c.lineTo(pts[j+1][0],pts[j+1][1]);c.stroke()}})}};
/* --- Подписки: песочные часы --- */
MYS.hourglass=function(c,S,t,dt,D){
 var cx=320,cyN=200,U=73.5,TP=22,f,kr=0,flowing=true,flipOn=false;
 var Rb=function(a){var A=Math.abs(a);return A<1.62?.13+1.17*Math.pow(Math.sin(A/1.62*Math.PI/2),.9):1.30*Math.sqrt(Math.max(0,1-Math.pow((A-1.62)/.42,2)))};
 var Rin=function(y){return Math.max(.02,Rb(y)*.92)};
 if(D.demo){var ph=(t%TP)/TP,RUN=.80,FS=RUN+.04,FE=FS+.11;if(ph<RUN)f=ph/RUN;else f=1;if(ph>=FS){kr=Math.min(1,(ph-FS)/(FE-FS));flipOn=ph<FE}if(ph>=FE){f=0;}flowing=ph<RUN*.985||ph>=FE||(ph>=FS&&kr>.8)}
 else{f=Math.max(0,Math.min(1,1-D.days/30));flowing=f>.002&&f<.998}
 if(S.ff==null)S.ff=f;
 var ar=function(y1,y2){var v=0,n=40,h=(y2-y1)/n,i;for(i=0;i<n;i++){var y=y1+h*(i+.5);v+=Math.PI*Math.pow(Rin(y),2)*h}return v};
 var V0=ar(.07,1.5),solve=function(fn,lo,hi,tg){for(var k=0;k<24;k++){var m=(lo+hi)/2;if(fn(m)<tg)lo=m;else hi=m}return(lo+hi)/2};
 var topG=function(ff){var dipf=function(L){return Math.min(.14+.5*ff,(L-.07)*.85)};var vol=function(L){var R=Rin(L);return ar(.07,L)-2*Math.PI*dipf(L)*R*R*(.5-1/3.5)};var L=solve(vol,.07,2.0,V0*(1-ff));return{L:L,dip:dipf(L),R:Rin(L)}};
 var botG=function(ff){var mf=function(L){return Math.max(0,Math.min(.2+.5*Math.min(1,ff*3.5),(-.12-L)*.95))};var vol=function(L){var R=Rin(L),m=mf(L);return ar(-2.0,L)+2*Math.PI*m*R*R*(.5-1/3.25)};var L=solve(vol,-2.0,-.1,V0*ff);return{L:L,m:mf(L),R:Rin(L)}};
 var X=function(u){return cx+u*U},Y=function(y){return cyN-y*U};
 var sandFill=function(alpha){var g=c.createLinearGradient(cx-110,0,cx+110,0);g.addColorStop(0,"rgba(255,255,255,"+alpha+")");g.addColorStop(.45,"rgba(240,240,240,"+alpha+")");g.addColorStop(1,"rgba(120,120,120,"+alpha+")");c.fillStyle=g};
 var drawTop=function(ff,alpha){if(ff>.985)return;var g=topG(ff),i,y;c.beginPath();
  for(i=0;i<=16;i++){var r=g.R*(-1+2*i/16);c.lineTo(X(r),Y(g.L-g.dip*(1-Math.pow(Math.abs(r)/g.R,1.5))))}
  for(y=g.L;y>=.07;y-=.1)c.lineTo(X(Rin(y)),Y(y));c.lineTo(X(.02),Y(.07));c.lineTo(X(-.02),Y(.07));
  for(y=.07;y<=g.L;y+=.1)c.lineTo(X(-Rin(y)),Y(y));c.closePath();sandFill(alpha);c.fill()};
 var drawBot=function(ff,alpha){if(ff<.003)return null;var g=botG(ff),i,y;c.beginPath();c.moveTo(X(-.02),Y(-2.0));c.lineTo(X(.02),Y(-2.0));
  for(y=-2.0;y<g.L;y+=.1)c.lineTo(X(Rin(y)),Y(y));
  for(i=0;i<=16;i++){var r=g.R*(1-2*i/16);c.lineTo(X(r),Y(g.L+g.m*(1-Math.pow(Math.abs(r)/g.R,1.25))))}
  for(y=g.L-.0;y>-2.0;y-=.1)c.lineTo(X(-Rin(y)),Y(y));c.closePath();sandFill(alpha);c.fill();return g.L+g.m};
 var easeK=mySm(kr);
 c.save();c.translate(cx,cyN);c.rotate(Math.PI*easeK);c.translate(-cx,-cyN);
 // стойки сзади
 c.fillStyle="rgba(255,255,255,.35)";c.fillRect(X(0)-3,Y(2.1),6,Y(-2.1)-Y(2.1));
 // стекло
 c.beginPath();var yy;for(yy=-2.04;yy<=2.04;yy+=.06)c.lineTo(X(Rb(yy)),Y(yy));for(yy=2.04;yy>=-2.04;yy-=.06)c.lineTo(X(-Rb(yy)),Y(yy));c.closePath();c.fillStyle="rgba(255,255,255,.07)";c.fill();
 var peak=-2.0;
 if(!flipOn){drawTop(f,1);var pk=drawBot(f,1);if(pk!=null)peak=pk}
 else{ // при перевороте песок едет вместе со стеклом и переходит
  var cf=mySm((kr-.45)/.55);drawBot(1,1-cf);c.save();c.translate(cx,cyN);c.rotate(Math.PI);c.translate(-cx,-cyN);drawTop(0,cf);c.restore()}
 c.strokeStyle="rgba(255,255,255,.75)";c.lineWidth=3;c.beginPath();for(yy=-2.04;yy<=2.04;yy+=.06)c.lineTo(X(Rb(yy)),Y(yy));c.stroke();c.beginPath();for(yy=-2.04;yy<=2.04;yy+=.06)c.lineTo(X(-Rb(yy)),Y(yy));c.stroke();
 // рамка: плиты и боковые стойки
 var plate=function(y){var pg=c.createLinearGradient(cx-130,0,cx+130,0);pg.addColorStop(0,"#555");pg.addColorStop(.4,"#ddd");pg.addColorStop(1,"#666");c.fillStyle=pg;c.beginPath();c.ellipse(cx,Y(y),128,13,0,0,6.2832);c.fill();c.fillRect(cx-128,Y(y),256,10);c.beginPath();c.ellipse(cx,Y(y)+10,128,13,0,0,Math.PI);c.fill();c.fillStyle="#f0f0f0";c.beginPath();c.ellipse(cx,Y(y),128,13,0,0,6.2832);c.fill()};
 plate(2.2);plate(-2.3);
 c.fillStyle="rgba(235,235,235,.85)";c.fillRect(X(-1.62)-6,Y(2.2),7,Y(-2.3)-Y(2.2));c.fillRect(X(1.62)-1,Y(2.2),7,Y(-2.3)-Y(2.2));
 // струя
 if(flowing){var j,top2=Y(.08),bot=Y(peak+.02);
  for(j=0;j<70;j++){var uu=(t*.9+myRnd(j,1))%1;var gy=top2+(bot-top2)*Math.pow(uu,1.7);var gx=cx+(myRnd(j,2)-.5)*(3+14*uu)+Math.sin(uu*14+j)*1.2;c.fillStyle="rgba(255,255,255,"+(1-.4*uu)+")";c.beginPath();c.arc(gx,gy,1.5+.8*(1-uu),0,6.2832);c.fill()}
  for(j=0;j<30;j++){var sv=(t*.5+myRnd(j,5))%1,ang=myRnd(j,6)*6.28,rr=(.25+myRnd(j,7)*.7)*30*sv,hh=18*Math.sin(sv*Math.PI)*(.4+myRnd(j,8));c.fillStyle="rgba(255,255,255,"+(1-sv)*.8+")";c.beginPath();c.arc(cx+Math.cos(ang)*rr,bot-hh,1.3,0,6.2832);c.fill()}}
 c.restore()};
/* --- Заметки: свиток, перо пишет строки --- */
MYS.scroll=function(c,S,t,dt,D){
 var n=Math.max(0,Math.min(12,Math.round(D.notes)));
 if(S.w==null){S.w=0;S.cyc=t}
 if(D.demo&&t-S.cyc>20){S.w=0;S.cyc=t}
 if(S.w>n)S.w=n;if(S.w<n)S.w=Math.min(n,S.w+dt*.85);
 var pg=c.createLinearGradient(0,70,0,330);pg.addColorStop(0,"#808080");pg.addColorStop(.12,"#c8c8c8");pg.addColorStop(.88,"#c4c4c4");pg.addColorStop(1,"#707070");
 c.fillStyle=pg;c.fillRect(150,68,340,264);
 var roll=function(y){var g=c.createLinearGradient(0,y-16,0,y+16);g.addColorStop(0,"#444");g.addColorStop(.35,"#f0f0f0");g.addColorStop(1,"#3a3a3a");c.fillStyle=g;c.fillRect(128,y-16,384,32);
  [128,512].forEach(function(x){c.fillStyle="#d8d8d8";c.beginPath();c.ellipse(x,y,9,16,0,0,6.2832);c.fill();c.strokeStyle="#333";c.lineWidth=2;c.stroke();c.fillStyle="#777";c.beginPath();c.ellipse(x,y,3,6,0,0,6.2832);c.fill()})};
 roll(62);roll(338);
 var i,pen=null;
 for(i=0;i<Math.ceil(S.w);i++){var prog=Math.min(1,S.w-i),y=100+i*19,wd=150+myRnd(i,9)*160,x=170,d=0;
  c.strokeStyle="rgba(25,25,25,.9)";c.lineWidth=4.2;c.lineCap="round";
  var full=wd*prog,seg=0;while(seg<full){var L=12+myRnd(i*7+d,3)*32;L=Math.min(L,full-seg);c.beginPath();c.moveTo(x+seg,y);c.lineTo(x+seg+L,y);c.stroke();seg+=L+7;d++}
  if(prog<1)pen=[x+full,y]}
 if(pen){c.fillStyle="#fff";c.beginPath();c.moveTo(pen[0],pen[1]);c.lineTo(pen[0]+34,pen[1]-40);c.lineTo(pen[0]+40,pen[1]-34);c.closePath();c.fill();c.fillStyle="#222";c.beginPath();c.arc(pen[0],pen[1],2.2,0,6.2832);c.fill()}};

/* --- страницы, данные, слой --- */
var MYP=[
 {n:"Сегодня",c:null,rows:function(){return[["ck on done","Сдать лабу по физике","завтра"],["ck","Прочитать главу","16 окт"],["ck","Купить подарок","18 окт"]]},b:"Добавить",q:["Надежда — то, что делает нас сильными. Вот почему мы здесь: этим ты сражаешься, когда всё остальное потеряно.","по мотивам God of War III, не дословно"]},
 {n:"Проекты",c:"vase",rows:function(D){return[["sq","Новая тема по мифам","идея"],["sq","Хаб","в работе "+Math.round(D.proj)+"%"],["sq","Телеграм-бот","завершён"]]},b:"Добавить",q:["Нет великого замысла. Нет сценария. Есть только выбор, который ты делаешь.","по мотивам God of War Ragnarök, не дословно"]},
 {n:"Задачи",c:"stars",rows:function(D){return[["ck on done","Подвиг I · Сдать лабу","завтра"],["ck","Подвиг II · Прочитать главу","16 окт"],["dt","Цель · созвездие Стрелец",Math.round(D.stars)+" из 8"]]},b:"Добавить",q:["Не извиняйся, отец. Становись лучше.","по мотивам God of War, не дословно"]},
 {n:"Итоги недели",c:"coins",rows:function(D){return[["dt","Монеты в ящике",Math.round(D.coins)+" из 20"],["dt","Вороны Одина",Math.round(D.ravens)+" из 12"],["dt","Предания открыты",Math.round(D.lore)+" из 40"]]},b:"",q:["Людей тревожат не сами вещи, а мнения о вещах.","Эпиктет, Энхиридион 5"]},
 {n:"Заметки",c:"scroll",rows:function(D){return[["dt","Идея · тема по мифам","вчера"],["dt","Свиток · записей",Math.round(D.notes)+""],["dt","Ящик Пандоры · входящие","3 записи"]]},b:"Добавить",q:["Жизнь без исследования не стоит того, чтобы её проживать.","Сократ, по «Апологии» Платона, 38a"]},
 {n:"Подписки",c:"hourglass",rows:function(D){return[["rg","Ближайшее списание",D.demo?"по часам":"через "+Math.round(D.days)+" дн."],["rg","Подписка А","5 окт"],["rg","Подписка Б","11 окт"]]},b:"Добавить",q:["Ничто, Луцилий, не принадлежит нам, кроме времени.","Сенека, Письма к Луцилию, 1"]},
 {n:"Настройки",c:null,video:"gears",rows:function(){return[["dt","Тема","Мифы"],["tg on","Анимации","вкл"],["tg on","Заставка при входе","вкл"]]},b:"",q:["Пусть каждый будет умён с умеренностью: у кого много ума, тому нелегко жить радостно.","Старшая Эдда, «Речи Высокого», пересказ"]}];
function myVid(k,loop){return '<video '+(loop?"loop ":"")+'autoplay muted playsinline><source src="'+MYW[k]+'" type="video/webm"><source src="'+MYV[k]+'" type="video/mp4"></video>'}
function myRows(P){var s="";P.rows(MYD).forEach(function(r){var k=r[0],done=k.indexOf("done")>=0,on=k.indexOf("on")>=0;s+='<div class="ad-row'+(done?' done':'')+'"><i class="ad-m '+k.replace(" done","")+'">'+(k.indexOf("ck")===0&&on?"✓":"")+'</i><span>'+r[1]+'</span><em>'+r[2]+'</em></div>'});return s}
function myRaven(){var G=["..................................", "..................................", "..................................", ".....................11111........", "....................12h2221.......", ".................1112h2222211.....", "..............111222h22222bbb11...", "...........11122222h2222e2bbbbb11.", ".........112222222h2222222bbbbbbb1", "........122222hhhh22222222bkkkkkk1", ".......1222222233333222222b111111.", "......122223333333333222221.......", ".....122233333333333332211........", "....12223333333333333221..........", "....12333333333333333221..........", "...12233333333333332221...........", "...1233333333333332221............", "....13333333333322221.............", "...13333333322222221..............", "..13333222222222211...............", ".1333322222222l11.l...............", ".1222222111111l...l...............", "12222211......l...l...............", ".12221........l...l...............", "..121........l.l.l.l..............", "...1....wwwwwwwwwwwwwwwwwwwww.....", "..........vvvvvvvvvvvvvvvv........", ".................................."];
 var cl={"1":"var(--rv1)","2":"var(--rv2)","3":"color-mix(in srgb,var(--rv2) 68%,#000)","h":"color-mix(in srgb,var(--rv2) 60%,#fff)","e":"var(--a)","b":"#cdbf9a","k":"#3a3326","l":"#8a8a8a"},head="",body="";
 G.forEach(function(row,y){for(var x=0;x<row.length;x++){var ch=row[x];if(ch==="."||!cl[ch])continue;var r='<rect x="'+x+'" y="'+y+'" width="1.03" height="1.03" fill="'+cl[ch]+'"'+(ch==="e"?' class="rv-eye"':'')+'/>';if(y<=11&&x>=21)head+=r;else body+=r}});
 return '<svg class="cl-cat ad-cat myth-raven" viewBox="0 0 34 28" shape-rendering="crispEdges" aria-hidden="true"><g>'+body+'</g><g class="rv-head">'+head+'</g></svg>'}
(function(){
 var f=LY.adam;
 LY.adam=function(th){
  var h=f(th); if(!th||!/^myth/.test(th.k))return h;
  var pg=RB?Math.min(ADPG,MYP.length-1):0,P=MYP[pg],i,pal=MYPALS[th._pal||MYPAL];
  var tabs="";for(i=0;i<MYP.length;i++)tabs+='<span role="button" aria-pressed="'+(i===pg)+'" data-adpg="'+i+'"'+(i===pg?' class="on"':'')+'>'+MYP[i].n+'</span>';
  var chips="";if(RB){chips='<span class="myth-pal">';for(var kk in MYPALS)chips+='<button type="button" data-mypal="'+kk+'"'+(kk===(th._pal||MYPAL)?' class="on"':'')+'>'+MYPALS[kk].n+'</button>';chips+='</span><button class="myth-sp" type="button" data-mysp="1">▶ заставка</button>'}
  h=h.replace(/<div class="lay ad ad-myth"/,'<div class="lay ad ad-myth" style="--rv1:'+pal.r1+';--rv2:'+pal.r2+';--rvt:'+pal.t+';--rva:'+pal.asc+'"');
  h=h.replace(/<div class="ad-t">[\s\S]*?<\/div><div class="ad-d">[\s\S]*?<\/div>/,'<div class="ad-t">'+P.n+'</div><div class="ad-d">'+DTS()+'</div>');
  h=h.replace(/<div class="ad-tabs">[\s\S]*?<\/div>(?=<pre)/,'<div class="ad-tabs">'+tabs+'</div><div class="myth-rage" title="Ярость растёт с каждой закрытой задачей и медленно остывает"><span>Ярость</span><u><i style="width:'+Math.round(MYD.rage)+'%"></i></u><b>'+Math.round(MYD.rage)+'%</b>'+chips+'</div>');
  if(P.video)h=h.replace(/<pre class="ad-asc"[\s\S]*?<\/pre>/,'<div class="myth-st" data-sc="'+P.video+'">'+myVid(P.video,1)+'</div>');
  else if(P.c)h=h.replace(/<pre class="ad-asc"[\s\S]*?<\/pre>/,'<div class="myth-st" data-sc="'+P.c+'">'+myVid(P.c,1)+'</div>');
  h=h.replace(/<svg class="[^"]*ad-cat"[\s\S]*?<\/svg>/,myRaven());
  var j=h.indexOf("</svg>",h.indexOf('class="ad-card"')),k2=h.indexOf('<div class="h9-side">');
  if(j>0&&k2>j)h=h.slice(0,j+6)+myRows(P)+'</div>'+h.slice(k2);
  h=h.replace(/<div class="h9-side">[\s\S]*?<\/div><\/div><\/div>$/,'<div class="h9-side"><blockquote class="myq"><p>«'+P.q[0]+'»</p><cite>— '+P.q[1]+'</cite></blockquote>'+(P.b?'<div class="ad-btn">'+P.b+'</div>':'')+'</div></div></div>');
  return h};
 var _s=screen;screen=function(th,big){if(th&&/^myth/.test(th.k)){var p=MYPALS[MYPAL];th=Object.assign({},th,{b:p.b,s:p.s,t:p.t,a:p.a,ba:p.ba,asc:p.asc,_pal:MYPAL})}return _s(th,big)};
 var _rb=renderBig;renderBig=function(){_rb();try{mythPanel()}catch(e){}};
 var st=document.createElement("style");
 st.textContent=".myth-st{position:relative;flex:1;min-height:4.5em;margin:.15em 0 .25em;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none}.myth-st video{max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:lighten;background:#000}.myth-cv{width:100%;height:100%;display:block;color:var(--rva)}.ad-myth .ad-t{color:var(--rvt)!important}"
 +".myq{margin:0;font:italic .78em/1.35 Georgia,'PT Serif',serif;color:var(--t);opacity:.9;border-left:2px solid var(--a);padding-left:.6em}.myq cite{display:block;font:500 .85em ui-monospace,Consolas,monospace;opacity:.7;margin-top:.25em;font-style:normal}"
 +".myth-sp,.myth-pal button{padding:.12em .6em;border-radius:99px;border:1px dashed color-mix(in srgb,var(--t) 35%,transparent);background:none;color:var(--t);font:inherit;font-size:.9em;cursor:pointer;pointer-events:auto}.myth-sp:hover,.myth-pal button:hover,.myth-pal button.on{background:var(--a);color:var(--ba);border-color:var(--a)}"
 +".myth-rage{display:flex;align-items:center;gap:.5em;font:500 .7em ui-monospace,Consolas,monospace;color:color-mix(in srgb,var(--t) 70%,transparent);flex-wrap:wrap}.myth-rage u{display:block;flex:0 1 9em;height:.45em;border-radius:99px;background:color-mix(in srgb,var(--t) 15%,transparent);overflow:hidden;text-decoration:none;min-width:4em}.myth-rage u i{display:block;height:100%;background:var(--a);border-radius:99px}.myth-pal{display:inline-flex;gap:.3em;margin-left:auto}"
 +".myth-raven{width:62px!important;height:auto!important;top:auto!important;bottom:calc(100% - 3px)!important}.myth-raven .rv-head{transform-box:view-box;transform-origin:21px 12px;animation:rvtilt 7s ease-in-out infinite}.myth-raven .rv-eye{animation:rvblink 5s infinite}@keyframes rvtilt{0%,62%,100%{transform:rotate(0)}68%{transform:rotate(-9deg)}76%{transform:rotate(4deg)}84%{transform:rotate(-3deg)}}@keyframes rvblink{0%,92%,100%{opacity:1}95%{opacity:.1}}"
 +"#myth-ov{position:fixed;inset:0;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer}#myth-ov video{max-width:100%;max-height:100%}"
 +".myth-panel{margin-top:1em;padding:.8em 1em;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:12px;font-size:13px}.myth-panel h4{margin:0 0 .6em;font-size:13px}.myth-panel label{display:grid;grid-template-columns:9.5em 1fr 2.6em;gap:.6em;align-items:center;margin:.25em 0}.myth-panel label b{font-weight:500;text-align:right}.myth-panel p{margin:.5em 0 0;opacity:.7;font-size:12px;line-height:1.4}";
 document.head.appendChild(st);
 document.addEventListener("click",function(e){
  if(e.target.closest&&e.target.closest("#myth-ov")){var o=document.getElementById("myth-ov");if(o)o.remove();return}
  var pb=e.target.closest&&e.target.closest("[data-mypal]");
  if(pb){e.stopPropagation();MYPAL=pb.dataset.mypal;try{localStorage.setItem("mythPal",MYPAL)}catch(x){}renderBig();renderGrid();return}
  var b=e.target.closest&&e.target.closest("[data-mysp]");if(!b)return;e.stopPropagation();
  var o2=document.createElement("div");o2.id="myth-ov";o2.innerHTML=myVid("splash",0);
  var v=o2.querySelector("video");v.onended=function(){o2.remove()};document.body.appendChild(o2)},true);
})();
/* панель «Данные для примера» */
var MYSL=[["coins","Закрыто задач (монеты)",0,20,1],["stars","Звёзд цели (Стрелец)",0,8,1],["proj","Готовность проекта, %",0,100,1],["days","Дней до списания",0,30,1],["notes","Записей в свитке",0,12,1],["rage","Ярость, %",0,100,1],["ravens","Вороны Одина",0,12,1],["lore","Предания",0,40,1]];
function mythPanel(){var inf=document.querySelector("#big .info");if(!inf||document.querySelector("#big .myth-panel"))return;var th=getT(cur);if(!th||th.n!=="Мифы")return;
 var h='<div class="myth-panel"><h4>Данные для примера</h4>';MYSL.forEach(function(s){h+='<label>'+s[1]+'<input type="range" min="'+s[2]+'" max="'+s[3]+'" step="'+s[4]+'" value="'+MYD[s[0]]+'" data-myk="'+s[0]+'"><b>'+Math.round(MYD[s[0]])+'</b></label>'});
 h+='<label style="grid-template-columns:1fr auto"><span>Повторять показ сцен по кругу</span><input type="checkbox" data-mydemo '+(MYD.demo?'checked':'')+'></label><p>Это проверка: сцены берут числа отсюда. В приложении числа придут из задач, целей, проектов и подписок хаба.</p></div>';
 inf.insertAdjacentHTML("beforeend",h)}
document.addEventListener("input",function(e){var r=e.target.closest&&e.target.closest("[data-myk]");if(!r)return;MYD[r.dataset.myk]=+r.value;var b=r.parentNode.querySelector("b");if(b)b.textContent=r.value;
 var pg=Math.min(ADPG,MYP.length-1),P=MYP[pg],card=document.querySelector("#big .ad-card");
 if(card){var cat=card.querySelector("svg");var rows=card.querySelectorAll(".ad-row");rows.forEach(function(x){x.remove()});card.insertAdjacentHTML("beforeend",myRows(P))}
 var rg=document.querySelector("#big .myth-rage");if(rg){rg.querySelector("i").style.width=Math.round(MYD.rage)+"%";rg.querySelector("b").textContent=Math.round(MYD.rage)+"%"}});
document.addEventListener("change",function(e){if(e.target.matches&&e.target.matches("[data-mydemo]")){MYD.demo=e.target.checked;renderRowsDummy()}});
function renderRowsDummy(){var pg=Math.min(ADPG,MYP.length-1),card=document.querySelector("#big .ad-card");if(card){card.querySelectorAll(".ad-row").forEach(function(x){x.remove()});card.insertAdjacentHTML("beforeend",myRows(MYP[pg]))}}
/* рисование сцен: сцена рисуется в 2× (1280×800), символов столько, чтобы знак был около 4,5 px, на большом экране сетка гуще */
(function(){
 var last=0,ramp=" .:-=+*#%@",K=2,RW=640*K,RH=400*K;
 var atlas=null,atKey="";
 function glyphs(cwPx,chPx,col){
  var key=cwPx+"x"+chPx+col;if(atKey===key)return atlas;
  atlas=document.createElement("canvas");atlas.width=cwPx*ramp.length;atlas.height=chPx;
  var a=atlas.getContext("2d");a.font="bold "+(chPx*.98)+"px ui-monospace,Consolas,'Courier New',monospace";a.textBaseline="middle";a.textAlign="center";a.fillStyle=col;
  for(var k=1;k<ramp.length;k++)a.fillText(ramp[k],k*cwPx+cwPx/2,chPx/2);
  atKey=key;return atlas}
 function draw(cv,now){
  var m=cv._m;if(!m){m=cv._m={sc:cv.dataset.sc,S:{},oc:document.createElement("canvas"),t0:now,lt:now};m.oc.width=RW;m.oc.height=RH;m.c=m.oc.getContext("2d",{willReadFrequently:true})}
  var fn=MYS[m.sc];if(!fn)return;
  var dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
  var t=(now-m.t0)/1000,dt=Math.min(.1,(now-m.lt)/1000);m.lt=now;
  var c=m.c;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle="#000";c.fillRect(0,0,RW,RH);c.lineCap="butt";c.setTransform(K,0,0,K,0,0);
  fn(c,m.S,t,dt,MYD);
  var g=cv.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  var fit=Math.min(w,h*1.6),cols=Math.max(120,Math.min(300,Math.round(fit/(5.5*.6)))),rows=Math.round(cols*.375);
  var ch=Math.min(h/rows,w/cols/.6),cw=ch*.6,ox=(w-cw*cols)/2,oy=(h-ch*rows)/2;
  if(!m.sm||m.sm.width!==cols||m.sm.height!==rows){m.sm=document.createElement("canvas");m.sm.width=cols;m.sm.height=rows;m.sg=m.sm.getContext("2d",{willReadFrequently:true});m.sg.imageSmoothingEnabled=true;m.sg.imageSmoothingQuality="high"}
  m.sg.drawImage(m.oc,0,0,RW,RH,0,0,cols,rows);
  var px=m.sg.getImageData(0,0,cols,rows).data;
  var col=getComputedStyle(cv).getPropertyValue("--asc-c")||getComputedStyle(cv).color;
  var at=glyphs(Math.max(1,Math.round(cw*dpr)),Math.max(1,Math.round(ch*dpr)),col),cwP=at.width/ramp.length,chP=at.height;
  var cx,cy,i,j;
  for(cy=0;cy<rows;cy++)for(cx=0;cx<cols;cx++){
   var tn=px[(cy*cols+cx)*4]/255;tn=Math.min(1,Math.max(0,(tn-.03)*1.9));if(tn<.04)continue;var idx=Math.min(ramp.length-1,Math.floor(Math.pow(tn,.75)*ramp.length));if(idx<1)continue;
   g.globalAlpha=.6+.4*tn;g.drawImage(at,idx*cwP,0,cwP,chP,ox+cx*cw,oy+cy*ch,cw,ch)}
  g.globalAlpha=1}
 var MYRATE={hourglass:.5,scroll:.5,coins:.75,vase:.75,stars:.75,gears:.75};
 function slowVid(){document.querySelectorAll(".myth-st[data-sc] video").forEach(function(v){var r=MYRATE[v.parentNode.dataset.sc]||1;if(v._r!==r){v._r=r;v.playbackRate=r}})}
 function loop(now){requestAnimationFrame(loop);slowVid();if(now-last<33)return;last=now;document.querySelectorAll("canvas.myth-cv").forEach(function(cv){try{draw(cv,now)}catch(e){if(!window._myErr){window._myErr=e;console.error(e)}}})}
 requestAnimationFrame(loop)})();

/* Мифы: руны, тайны, ворон, Ярость, артефакт дня */
var MYRM={"а":"ᚨ","б":"ᛒ","в":"ᚹ","г":"ᚷ","д":"ᛞ","е":"ᛖ","ё":"ᛖ","ж":"ᛉ","з":"ᛉ","и":"ᛁ","й":"ᛃ","к":"ᚲ","л":"ᛚ","м":"ᛗ","н":"ᚾ","о":"ᛟ","п":"ᛈ","р":"ᚱ","с":"ᛊ","т":"ᛏ","у":"ᚢ","ф":"ᚠ","х":"ᚺ","ц":"ᛏ","ч":"ᚲ","ш":"ᛊ","щ":"ᛊ","ы":"ᛁ","э":"ᛖ","ю":"ᚢ","я":"ᛃ"," ":"᛫"};
function myRune(s){var r="";s=String(s).toLowerCase();for(var i=0;i<s.length;i++){var c=s[i];if(MYRM[c])r+=MYRM[c];else if(c==="ь"||c==="ъ")continue;else if(/[a-z]/.test(c))r+="ᛟ"}return r}
var MYSTN=[["Каус Австралис","«южная часть лука», самая яркая звезда Стрельца."],["Нунки","вторая по яркости звезда созвездия."],["Каус Медиа","«средняя часть лука»."],["Каус Бореалис","«северная часть лука»."],["Аскелла","по-латыни «подмышка» лучника."],["Альнасл","«наконечник стрелы» по-арабски."]];
var MYCAW={h:["Мысль улетает дальше всех, но к ужину возвращается.","Я облетел девять миров, а ты не закрыл одну задачу.","Один посылает нас на рассвете. Тебе пора начинать день."],m:["Я помню всё, что ты откладывал.","Память хуже мысли: она боится, что забудут её. Запиши.","Каждая закрытая задача оседает у меня в перьях."]};
var MYSEC={vase:"Ваза",stars:"Звёзды",coins:"Обол",sand:"Песок",scroll:"Свиток",gears:"Мастерская",raven:"Вороны",boy:"Парень",mimir:"Мимир",odin:"Один",rage:"Ярость",rune:"Руны"};
function myFound(){try{return JSON.parse(localStorage.getItem("mythFound")||"[]")}catch(e){return[]}}
function myMark(k){var f=myFound();if(f.indexOf(k)<0){f.push(k);try{localStorage.setItem("mythFound",JSON.stringify(f))}catch(e){}return true}return false}
function myToast(rune,txt,key){var L=document.querySelector("#big .lay.ad-myth")||document.querySelector(".lay.ad-myth");if(!L)return;var o=L.querySelector(".myth-toast");if(o)o.remove();
 var nw=key&&myMark(key),n=myFound().length,t=document.createElement("div");t.className="myth-toast";
 t.innerHTML='<i>'+(rune||"")+'</i><span>'+txt+'</span>'+(nw?'<b>Новая тайна · '+n+' из '+Object.keys(MYSEC).length+'</b>':'');L.appendChild(t);
 clearTimeout(window._myTT);window._myTT=setTimeout(function(){t.classList.add("out");setTimeout(function(){t.remove()},400)},nw?5200:4200)}
function myRage(){var L=document.querySelector("#big .lay.ad-myth");if(!L)return;var o=document.createElement("div");var tt=L.querySelector(".myth-toast");if(tt)tt.remove();o.className="myth-rageov";o.innerHTML="<span>ЯРОСТЬ СПАРТАНЦА</span><i>"+myRune("ярость")+"</i>";L.appendChild(o);setTimeout(function(){o.remove()},2600);myMark("rage")}
(function(){
 var f=LY.adam;
 LY.adam=function(th){var h=f(th);if(!th||!/^myth/.test(th.k))return h;
  var m=h.match(/<div class="ad-t">([^<]*)<\/div>/),nm=m?m[1]:"";
  h=h.replace(/(<div class="ad-d">[\s\S]*?<\/div>)/,'$1<div class="myth-runes" data-myrune="1" title="'+nm+'">'+myRune(nm)+'</div>');
  h=h.replace('</cite></blockquote>','</cite></blockquote><div class="myth-art"></div>');
  return h};
 var st=document.createElement("style");
 st.textContent=".myth-runes{font:500 .78em/1 'Noto Sans Runic','Segoe UI Historic','Segoe UI Symbol',serif;letter-spacing:.28em;color:var(--a);opacity:.85;margin:.1em 0 .15em;cursor:help;user-select:none;white-space:nowrap;overflow:hidden}"
 +".myth-st{pointer-events:auto!important;cursor:pointer}.myth-raven{cursor:pointer;pointer-events:auto}.myth-raven.flap{animation:rvflap .7s}@keyframes rvflap{0%{transform:translateY(0)}25%{transform:translateY(-14px)}50%{transform:translateY(0)}70%{transform:translateY(-6px)}100%{transform:translateY(0)}}"
 +".myth-rage{cursor:pointer}.myth-rage.full u i{box-shadow:0 0 .8em var(--a)}"
 +".myth-art{margin-top:.35em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font:.62em/1.35 ui-monospace,Consolas,monospace;color:var(--t);opacity:.62}.myth-art b{color:var(--a);font-weight:600}"
 +".myth-toast{position:absolute;left:50%;top:38%;transform:translateX(-50%);z-index:30;max-width:84%;padding:.7em 1em;border-radius:12px;background:color-mix(in srgb,var(--s) 94%,#000);color:var(--t);border:1px solid var(--a);box-shadow:0 8px 28px rgba(0,0,0,.45);font:.8em/1.4 Georgia,serif;text-align:center;animation:mtin .3s ease-out;pointer-events:none}.myth-toast.out{opacity:0;transition:opacity .4s}.myth-toast i{display:block;font:normal .9em 'Segoe UI Historic','Noto Sans Runic',serif;letter-spacing:.25em;color:var(--a);margin-bottom:.3em}.myth-toast b{display:block;margin-top:.45em;font:600 .75em ui-monospace,Consolas,monospace;color:var(--a)}@keyframes mtin{from{opacity:0;transform:translateX(-50%) translateY(8px)}}"
 +".myth-rageov{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4em;background:radial-gradient(ellipse at center,rgba(150,0,0,.1),rgba(160,10,10,.78));animation:mrg 2.6s ease-out forwards;pointer-events:none;color:#ffd9c9;font:700 1.5em Georgia,serif;letter-spacing:.12em;text-shadow:0 0 14px #f00}.myth-rageov i{font:normal .7em serif;letter-spacing:.4em;opacity:.8}@keyframes mrg{0%{opacity:0;transform:scale(1.08)}12%{opacity:1;transform:scale(1)}78%{opacity:1}100%{opacity:0}}";
 document.head.appendChild(st);
 var rc=0,buf="";
 document.addEventListener("click",function(e){var t=e.target;if(!t.closest)return;
  if(t.closest(".myth-raven")){var r=t.closest(".myth-raven");r.classList.remove("flap");void r.getBoundingClientRect();r.classList.add("flap");rc++;
   if(rc%7===0){myToast("ᛒᛟᛃ","«Парень.» Кратос не любит долгих речей.","boy");return}
   var hu=rc%2===1,A=hu?MYCAW.h:MYCAW.m;myToast(hu?"ᚺᚢᚷᛁᚾ":"ᛗᚢᚾᛁᚾ",(hu?"Хугин (Мысль): ":"Мунин (Память): ")+A[Math.floor(rc/2)%A.length],"raven");return}
  if(t.closest(".myth-rage")){var D=MYD;if(D.rage>=90)myRage();else myToast("ᚱᚨᚷᛖ","Ярость ещё не набрана. Закрывай задачи, она растёт сама.");return}
  if(t.closest("[data-myrune]")){var n=t.closest("[data-myrune]").getAttribute("title");myToast(myRune(n),"Эльдерфутарк. Здесь написано: «"+n+"». Руны читаются слева направо.","rune");return}
  var st=t.closest(".myth-st");if(st){var cv=st.querySelector("canvas"),vd=st.querySelector("video"),sc=cv?cv.dataset.sc:vd?(st.dataset.sc||"gears"):"";
   if(sc==="vase")myToast("ᛈᚨᚾᛞᛟᚱᚨ","Ваза, а не пифос Пандоры. Но надежда на дне всё равно осталась.","vase");
   else if(sc==="stars"){window._sn=((window._sn||0)+1)%MYSTN.length;var s=MYSTN[window._sn];myToast("ᚲᛁᚱᛟᚾ","Хирон учил героев стрельбе. "+s[0]+": "+s[1],"stars")}
   else if(sc==="coins")myToast("ᚲᚨᚱᛟᚾ","Обол Харона: плата за переправу через Стикс. Монеты в ящике твои, их не отдавай.","coins");
   else if(sc==="hourglass")myToast("ᛗᛟᛁᚱᚨ","Мойры прядут нить жизни: Клото прядёт, Лахесис отмеряет, Атропос режет.","sand");
   else if(sc==="scroll")myToast("ᛗᛁᛗᛁᚱ","Мимир хранит знание девяти миров. Запиши мысль, пока не забыл.","scroll");
   else if(sc==="gears")myToast("ᛒᚱᛟᚲ","Мастерская Брока и Синдри. Гномы-кузнецы делали и молот Тора, и золотые волосы Сиф.","gears")}
 });
 document.addEventListener("input",function(e){var t=e.target;if(t&&t.dataset&&t.dataset.myk==="rage"&&+t.value>=100)setTimeout(myRage,50)});
 document.addEventListener("keydown",function(e){var t=e.target;if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName))return;if(e.key.length!==1)return;buf=(buf+e.key.toLowerCase()).slice(-8);
  var W={boy:["ᛒᛟᛃ","«Парень.» Кратос слушает.","boy"],mimir:["ᛗᛁᛗᛁᚱ","Мимир: голова, которая знает все девять миров. Спросишь что-нибудь, ответит с ехидцей.","mimir"],odin:["ᛟᛞᛁᚾ","Один отдал глаз за глоток из источника Мимира. Ты свой глаз берегай.","odin"]};
  for(var k in W)if(buf.slice(-k.length)===k){myToast(W[k][0],W[k][1],W[k][2]);buf="";break}});
 var _ld=setInterval(function(){document.querySelectorAll("#big .myth-rage").forEach(function(r){r.classList.toggle("full",MYD.rage>=100)})},800);
})();
/* Мифы: пантеон, покровители, артефакты */
var MYGOD={
 odin:["ᛟᛞᛁᚾ","Один","Всеотец",["Девять ночей висел на Иггдрасиле, пронзённый копьём, и так добыл руны. Поэтому они здесь.","Глаз отдал за глоток из источника Мимира."],"Не распыляйся: у Одина был один глаз и одна цель."],
 thor:["ᚦᛟᚱ","Тор","Громовержец",["Сын Одина. Мьёльнир, пояс Мегингьярд и колесница с двумя козлами.","Козлов можно съесть, а наутро они оживут, если кости целы."],"Сложную задачу бьют сильно и один раз."],
 freya:["ᚠᚱᛖᛃᚨ","Фрейя","Богиня любви и войны",["Из рода ванов. Половина павших воинов уходит к ней в Фолькванг, половина к Одину.","Её колесницу везут кошки."],"Береги тех, кто рядом: это тоже победа."],
 mimir:["ᛗᛁᛗᛁᚱ","Мимир","Хранитель мудрости",["Хранитель источника под корнем Иггдрасиля.","По мифу ему отрубили голову, а Один сохранил её травами и советовался с ней."],"Запиши мысль сейчас. Позже она будет умнее, но тебя уже не будет рядом."],
 atreus:["ᚨᛏᚱᛖᚢᛊ","Атрей","Локи",["Сын Кратоса и Фэй. В играх мать дала ему имя Локи, как у бога-хитреца.","Стрелок: лук в его руках из серии God of War (2018)."],"Целься выше. Стрела всё равно упадёт ниже."],
 brokk:["ᛒᚱᛟᚲ","Брок и Синдри","Кузнецы-гномы",["Братья. Поспорили с Локи на его голову и выковали Мьёльнир, Драупнир и золотого кабана Гуллинборсти.","В играх у них мастерская и вечный спор, чья работа лучше."],"Проверь работу молотом, а не взглядом."],
 zeus:["ᛉᛖᚢᛊ","Зевс","Царь Олимпа",["Громовержец. Молнии для него выковали циклопы.","Щит Зевса, эгида, потом достался Афине."],"Итоги недели судит не Зевс, а ты. Будь строг и честен."],
 ares:["ᚨᚱᛖᛊ","Арес","Бог войны",["Сын Зевса и Геры. Гомер зовёт его самым ненавистным из сыновей Зевса.","В God of War (2005) Кратос служит ему, а потом убивает его."],"Ярость без плана быстро кончается."],
 athena:["ᚨᚦᛖᚾᚨ","Афина","Стратегия и ремёсла",["Родилась из головы Зевса в полном доспехе.","Её символы: сова и оливковая ветвь."],"Сначала план, потом задача."],
 hephaestus:["ᚺᛖᚠᛖᛊᛏ","Гефест","Бог-кузнец",["Хромой, но самый искусный из богов. По приказу Зевса вылепил из глины Пандору.","Выковал доспехи Ахиллу."],"Ремесло: делай медленно, один раз."],
 kronos:["ᚲᚱᛟᚾᛟᛊ","Кронос","Титан, отец Зевса",["Низверг своего отца Урана и боялся, что дети сделают то же с ним.","Позднее греки путали его с Хроносом, временем, отсюда песочные часы."],"Время не вернёшь. Потрать его так, чтобы не жалеть."],
 moirai:["ᛗᛟᛁᚱᚨᛁ","Мойры","Нить судьбы",["Клото прядёт нить, Лахесис отмеряет, Атропос режет.","Даже боги подчинялись их приговору."],"Срок подписки отмерен. Не дай ему оборваться без тебя."]
};
var MYPAT=[["odin","thor"],["hephaestus","brokk"],["athena","ares","atreus"],["zeus","freya"],["mimir","odin"],["kronos","moirai"],["brokk","hephaestus"]];
for(var _g in MYGOD)if(!MYSEC[_g])MYSEC[_g]=MYGOD[_g][1];
var MYKEY={thor:"thor",zeus:"zeus",ares:"ares",freya:"freya",athena:"athena",brok:"brokk",sindri:"brokk",gefest:"hephaestus",atreus:"atreus",loki:"atreus",kronos:"kronos"};
function myGodCard(id){var g=MYGOD[id];if(!g)return;myCard('<div class="myth-gi">'+g[0]+'</div>',g[1]+" · "+g[2],g[0],g[3].join(" "),"Совет от покровителя: "+g[4],id)}
/* артефакты */
var MYSV=function(b){return '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">'+b+'</svg>'};
var MYAS={
 draupnir:MYSV('<path fill="#e0aa3c" fill-rule="evenodd" d="M16 8a12 9.5 0 1 0 .01 0zm0 4.6a7.2 5 0 1 1-.01 0z"/><path fill="#a8761f" d="M5 18q2 8 11 8t11-8q-2 5-11 5T5 18z"/><path fill="#fff0a8" d="M7 13q3-4 9-4.3-5 1.4-7.5 5z"/><g fill="#f4c95a" stroke="#a8761f" stroke-width=".6"><ellipse cx="7" cy="5" rx="2.4" ry="1.5"/><ellipse cx="16" cy="3.2" rx="2.4" ry="1.5"/><ellipse cx="25" cy="5" rx="2.4" ry="1.5"/></g>'),
 gjallar:MYSV('<path d="M4 26Q6 8 26 6" fill="none" stroke="#7a5a1c" stroke-width="7.4" stroke-linecap="round"/><path d="M4 26Q6 8 26 6" fill="none" stroke="#d9b45a" stroke-width="5.4" stroke-linecap="round"/><path d="M6 23Q9 11 24 8" fill="none" stroke="#fff0a8" stroke-width="1.3" stroke-linecap="round" opacity=".8"/><ellipse cx="26.4" cy="6" rx="2.4" ry="4.2" transform="rotate(-16 26.4 6)" fill="#2a1d0c"/><g stroke="#7a5a1c" stroke-width="1.3"><path d="M10 14l3 3M17.5 9.4l2 3.4"/></g><circle cx="5" cy="26" r="2" fill="#a8761f"/>'),
 gungnir:MYSV('<g transform="rotate(38 16 16)"><rect x="14.8" y="8" width="2.4" height="23" rx="1" fill="#7a5230"/><rect x="15.6" y="8" width=".8" height="23" fill="#a87a4a"/><path d="M16 0l4 9-4-1.6L12 9z" fill="#c8d2e2"/><path d="M16 0l1.2 8-1.2-.4z" fill="#f2f6fc"/><g fill="#e0aa3c"><rect x="14.5" y="13" width="3" height="1.2"/><rect x="14.5" y="17" width="3" height="1.2"/><rect x="14.5" y="21" width="3" height="1.2"/></g></g>'),
 mjolnir:MYSV('<g transform="rotate(-18 16 16)"><rect x="14.4" y="15" width="3.2" height="15" rx="1" fill="#6b4524"/><path d="M14.4 20h3.2M14.4 23h3.2M14.4 26h3.2" stroke="#3b2411" stroke-width=".9"/><ellipse cx="16" cy="29.6" rx="2" ry="1.4" fill="#3b2411"/><rect x="5" y="5" width="22" height="11" rx="1.6" fill="#8e9bb0"/><rect x="5" y="5" width="22" height="3.6" rx="1.6" fill="#d6deea"/><rect x="5" y="12.6" width="22" height="3.4" rx="1.6" fill="#5d6a7e"/><path d="M13 8l3 2.4 3-2.4M13 11.6l3-2.4 3 2.4" fill="none" stroke="#e0aa3c" stroke-width="1"/></g>'),
 skid:MYSV('<path d="M2 18l4.5 2L30 18l-3 6q-11 5-22 0z" fill="#8a5a2e"/><path d="M5 22q11 3.4 22 0" fill="none" stroke="#5a3a1c" stroke-width="1.2"/><path d="M27 18l3.5-5-1 6z" fill="#c9954c"/><rect x="15.4" y="3" width="1.2" height="16" fill="#5a3a1c"/><path d="M16.6 4q9 5 10 12H16.6z" fill="#f3ead2"/><path d="M15.4 6Q8 9.5 6.4 16h9z" fill="#dcd0b0"/><path d="M16.6 8q5 3 6.4 8M15.4 9.5Q11 12 10 16" stroke="#c8b98c" stroke-width=".6" fill="none"/><path d="M1 27q3-2 6 0t6 0 6 0 6 0 5 0" stroke="#4d9ad6" stroke-width="1.4" fill="none"/>'),
 aegis:MYSV('<circle cx="16" cy="16" r="14" fill="#8a4e1f"/><circle cx="16" cy="16" r="12.5" fill="#c77d3a"/><circle cx="16" cy="16" r="11" fill="none" stroke="#e8b070" stroke-width=".8"/><g stroke="#5f8a4d" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M16 5.5q-2-3 0-3.6M21 7q2-3 4-1.6M24.8 11.4q3-1 3.4 1.4M7.2 11.4q-3-1-3.4 1.4M11 7q-2-3-4-1.6M25 21q3 1 3-1.6M7 21q-3 1-3-1.6"/></g><circle cx="16" cy="16.5" r="6.2" fill="#e4d5ac"/><circle cx="13.5" cy="15" r="1.2" fill="#2a1d0c"/><circle cx="18.5" cy="15" r="1.2" fill="#2a1d0c"/><path d="M13 19.4q3 2 6 0" stroke="#8a4e1f" stroke-width="1.1" fill="none"/>'),
 sandals:MYSV('<path d="M6 21l3.5-8h9.5l2.5 8z" fill="#c9a06a"/><path d="M6 21h19.4q1.6 0 1.6 2.4T24 26H8q-2 0-2-2.4z" fill="#6b4524"/><path d="M10 15l8 2M9 18l12 1.4" stroke="#7a5230" stroke-width="1.2"/><g fill="#f4f7ff" stroke="#8fa1c0" stroke-width=".7"><path d="M8 14Q1 11 .6 5q6 .4 9 5z"/><path d="M8.6 16.6Q1.4 16 0 10.6q6.4 1 9.6 4z"/><path d="M9 19Q3 20 1 15.4q5.4 1 8 2.6z"/></g>'),
 pithos:MYSV('<path d="M10.6 7q-5 8-2 18 7 4.4 14.8 0 3-10-2-18z" fill="#c0643a"/><path d="M12 8q-4 7-1.6 16-1-8 1.6-16z" fill="#e08a5a" opacity=".7"/><path d="M8.6 14.5q7.4 2.4 14.8 0M8.4 21q7.6 2.4 15.2 0" stroke="#7d3a1c" stroke-width="1.3" fill="none"/><rect x="11" y="4.6" width="10" height="3.4" rx="1.4" fill="#9a4b28"/><path d="M8.6 11q-4 1-3 5t4 4M23.4 11q4 1 3 5t-4 4" fill="none" stroke="#9a4b28" stroke-width="1.6"/><path d="M14 4.4q-3-2 0-3.4t1 -1M18 4.4q3-2.4 0-4" stroke="#9b7ad0" stroke-width="1.2" fill="none" opacity=".8"/><circle cx="16" cy="25" r="2" fill="#fff0a8"/><path d="M16 21.6v6.8M12.6 25h6.8" stroke="#e0aa3c" stroke-width=".8"/>'),
 fleece:MYSV('<path d="M2 3h28" stroke="#4d3320" stroke-width="2.2" stroke-linecap="round"/><path d="M6 4Q3.4 10 6 14q-2.4 4 1 8-.4 4 3.6 6 2 2.4 5 .4 2.8 2.4 5.4-.2 3.4-.6 3.6-5 2.6-3.4 .4-7.4 2.6-4 0-9 1-1.4 0-2.4z" fill="#e0aa3c"/><g fill="none" stroke="#fff0a8" stroke-width="1.2" stroke-linecap="round"><path d="M9 9q2-2 4 0M16 8q2.4-1.6 4 .6M22 11q2-1.4 3.4.4M8 16q2.4-2 4.4 0M15 15q2.6-2 4.4 0M21 17.6q2-1.6 3.6 0M10 22q2.4-1.6 4 0M17 22q2.4-1.8 4 0"/></g><path d="M7 25q3 3 7 1 3 2.6 6 0" stroke="#a8761f" stroke-width="1" fill="none"/>'),
 thread:MYSV('<circle cx="13" cy="19" r="9.4" fill="#a82a24"/><circle cx="13" cy="19" r="9.4" fill="none" stroke="#6b1814" stroke-width=".9"/><g fill="none" stroke="#e8624c" stroke-width="1.1" stroke-linecap="round"><path d="M5.6 15q7-5 14 .4M4.2 19q8.6-5 17 .4M5 23.4q8-4.6 15.4-.4M8 11.4q4.4 3 8.4 12.4"/></g><path d="M21.6 20q8-.4 7-7.4t-8-4.4q-5 2 0 6.2" fill="none" stroke="#c63a30" stroke-width="1.6" stroke-linecap="round"/><path d="M26 4.6l2-2" stroke="#e0aa3c" stroke-width="1"/>'),
 blades:MYSV('<g transform="rotate(-18 11 24)"><path d="M11 1l3.4 13v6H7.6v-6z" fill="#c8d2e2"/><path d="M11 1l1.4 13v6H11z" fill="#eef3fb"/><path d="M11 1l3.4 13" stroke="#ff7a2a" stroke-width="1.1" fill="none"/><rect x="6.4" y="19.6" width="9.2" height="2" rx=".8" fill="#e0aa3c"/><rect x="9.8" y="21.4" width="2.4" height="4" rx=".8" fill="#5b3a29"/></g><g transform="matrix(-1 0 0 1 32 0) rotate(-18 11 24)"><path d="M11 1l3.4 13v6H7.6v-6z" fill="#c8d2e2"/><path d="M11 1l1.4 13v6H11z" fill="#eef3fb"/><path d="M11 1l3.4 13" stroke="#ff7a2a" stroke-width="1.1" fill="none"/><rect x="6.4" y="19.6" width="9.2" height="2" rx=".8" fill="#e0aa3c"/><rect x="9.8" y="21.4" width="2.4" height="4" rx=".8" fill="#5b3a29"/></g><path d="M8.4 25.6Q16 31.6 23.6 25.6" fill="none" stroke="#6b1814" stroke-width="2.6" stroke-dasharray="2.4 1.2" stroke-linecap="round"/><path d="M8.4 25.6Q16 31.6 23.6 25.6" fill="none" stroke="#ff7a2a" stroke-width="1.3" stroke-dasharray="2.4 1.2" stroke-linecap="round"/>'),
 leviathan:MYSV('<g transform="rotate(30 16 16)"><rect x="14.8" y="6" width="2.4" height="25" rx="1" fill="#6b4524"/><rect x="15.5" y="6" width=".8" height="25" fill="#a87a4a"/><g stroke="#7fdcff" stroke-width="1" fill="none"><path d="M14.8 14l2.4 1.2M14.8 19l2.4 1.2M14.8 24l2.4 1.2"/></g><path d="M15 4Q4 6 3 15Q9 14 15 15z" fill="#aab8cc"/><path d="M15 4Q7 5.6 5 10Q10 9 15 10z" fill="#e8f2ff"/><path d="M15 4Q4 6 3 15" fill="none" stroke="#5d6a7e" stroke-width=".8"/><path d="M17 8l5 1.6-1 4.4-4-1z" fill="#8e9bb0"/><g fill="#9fd8ff"><path d="M7 7l1 -2 1 2-1 2z"/><path d="M11 12l.8-1.6.8 1.6-.8 1.6z"/></g></g>')
};
var MYART=[["Драупнир","draupnir","ᛞᚱᚨᚢᛈᚾᛁᚱ","Кольцо Одина. Каждую девятую ночь из него капают восемь таких же.","Один"],["Гьяллархорн","gjallar","ᚷᛃᚨᛚᛚᚨᚱ","Рог Хеймдалля. Его услышат все девять миров, когда начнётся Рагнарёк.","Хеймдалль"],["Гунгнир","gungnir","ᚷᚢᚾᚷᚾᛁᚱ","Копьё Одина, которое не промахивается. Выковано сыновьями Ивальди.","Один"],["Мьёльнир","mjolnir","ᛗᛃᛟᛚᚾᛁᚱ","Молот Тора, всегда возвращается в руку. Выкован братьями Броком и Синдри.","Тор"],["Скидбладнир","skid","ᛊᚲᛁᛞᛒᛚᚨᛞᚾᛁᚱ","Лучший из кораблей: паруса всегда попутны, а сам он складывается, как платок.","Фрейр"],["Эгида","aegis","ᚨᛖᚷᛁᛞᚨ","Щит с головой Горгоны. Принадлежал Зевсу, потом Афине.","Зевс и Афина"],["Крылатые сандалии","sandals","ᛏᚨᛚᚨᚱᛁᚨ","Сандалии Гермеса, быстрее любого гонца.","Гермес"],["Пифос Пандоры","pithos","ᛈᛁᚦᛟᛊ","Сосуд, из которого вышли беды. На дне осталась надежда.","Пандора"],["Золотое руно","fleece","ᚲᚱᛁᛊᛟᛗᚨᛚᛚᛟᚾ","Шкура золотого барана. Ради неё Ясон собрал аргонавтов.","Ясон"],["Нить Ариадны","thread","ᚨᚱᛁᚨᛞᚾᛖ","Клубок, по которому Тесей вышел из лабиринта.","Ариадна"],["Клинки Хаоса","blades","ᚲᛚᛁᚾᚲᛁ","Цепные клинки из God of War. Прикованы к рукам Кратоса.","Кратос"],["Топор Левиафан","leviathan","ᛚᛖᚢᛁᚨᚦᚨᚾ","Ледяной топор из God of War (2018). Возвращается в руку по зову.","Кратос"]];
function myCard(icon,title,rune,txt,meta,key){var L=document.querySelector("#big .lay.ad-myth")||document.querySelector(".lay.ad-myth");if(!L)return;var o=L.querySelector(".myth-toast");if(o)o.remove();
 var nw=key&&myMark(key),n=myFound().length,t=document.createElement("div");t.className="myth-toast card";
 t.innerHTML='<div class="mc-ic">'+icon+'</div><div class="mc-tx"><i>'+rune+'</i><h5>'+title+'</h5><span>'+txt+'</span><em>'+meta+'</em>'+(nw?'<b>Новая тайна · '+n+' из '+Object.keys(MYSEC).length+'</b>':'')+'</div>';L.appendChild(t);
 clearTimeout(window._myTT);window._myTT=setTimeout(function(){t.classList.add("out");setTimeout(function(){t.remove()},400)},nw?7500:6500)}
function myArtCard(i){var a=MYART[i];myCard(MYAS[a[1]],a[0],a[2],a[3],"Принадлежал: "+a[4],"art"+i)}
for(var _i=0;_i<MYART.length;_i++)MYSEC["art"+_i]=MYART[_i][0];
(function(){
 var f=LY.adam;
 LY.adam=function(th){var h=f(th);if(!th||!/^myth/.test(th.k))return h;
  var pg=RB?Math.min(ADPG,MYP.length-1):0,pl=MYPAT[pg],g=MYGOD[pl[0]];
  h=h.replace(/(<div class="myth-runes"[^>]*>[^<]*<\/div>)/,'$1<button type="button" class="myth-pat" data-mypat="'+pg+'" data-i="0" title="Нажми: покровители страницы">Покровитель: '+g[1]+' ›</button>');
  var d=new Date(),doy=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5),ai=doy%MYART.length,A=MYART[ai];
  h=h.replace(/<div class="myth-art"[\s\S]*?<\/div>/,'<div class="myth-art" data-myart="'+ai+'" title="'+A[0]+'"><span class="ma-ic">'+MYAS[A[1]]+'</span><span class="ma-tx"><b>Артефакт дня</b>'+A[0]+'</span></div>');
  return h};
 var st=document.createElement("style");
 st.textContent=".myth-pat{display:block;margin:.1em 0 .2em;padding:0;border:0;background:none;color:var(--t);opacity:.75;font:500 .68em ui-monospace,Consolas,monospace;cursor:pointer;text-align:left}.myth-pat:hover{opacity:1;color:var(--a)}"
 +".myth-art{display:flex;align-items:center;gap:.55em;margin-top:.45em;cursor:pointer;opacity:1!important;white-space:normal!important}.myth-art .ma-ic{flex:0 0 2.5em;width:2.5em;height:2.5em;border-radius:.6em;background:color-mix(in srgb,var(--a) 14%,transparent);border:1px solid color-mix(in srgb,var(--a) 45%,transparent);padding:.15em}.myth-art svg{display:block;width:100%;height:100%}.myth-art .ma-tx{font:600 .8em/1.3 Georgia,serif;color:var(--t)}.myth-art .ma-tx b{display:block;font:500 .85em ui-monospace,Consolas,monospace;color:var(--a);letter-spacing:.04em;text-transform:uppercase}"
 +".myth-toast.card{display:flex;gap:.9em;text-align:left;align-items:center;max-width:90%;width:max-content;padding:.9em 1.1em}.myth-toast .mc-ic{flex:0 0 5.2em;width:5.2em;height:5.2em;border-radius:.8em;background:color-mix(in srgb,var(--a) 14%,transparent);border:1px solid color-mix(in srgb,var(--a) 50%,transparent);padding:.35em}.myth-toast .mc-ic svg{display:block;width:100%;height:100%;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}.myth-toast .mc-ic .myth-gi{font:normal 1.3em/1.1 'Segoe UI Historic','Noto Sans Runic',serif;color:var(--a);display:flex;height:100%;align-items:center;justify-content:center;text-align:center;word-break:break-all;letter-spacing:.05em}.mc-tx{min-width:0;max-width:20em}.mc-tx i{display:block;margin:0 0 .15em!important;font:normal .8em 'Segoe UI Historic','Noto Sans Runic',serif;letter-spacing:.2em;color:var(--a)}.mc-tx h5{margin:0 0 .25em;font:700 1.05em Georgia,serif}.mc-tx>span{font-size:.92em}.mc-tx em{display:block;margin-top:.4em;font:italic .85em Georgia,serif;opacity:.75}"
 +".myth-col{margin-top:1em;padding:.8em 1em;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:12px;font-size:13px}.myth-col h4{margin:0 0 .6em;font-size:13px}.myth-col .mgr{display:flex;flex-wrap:wrap;gap:6px}.myth-col button{border:1px solid color-mix(in srgb,currentColor 25%,transparent);background:none;color:inherit;border-radius:99px;padding:.2em .7em;font:inherit;font-size:12px;cursor:pointer;opacity:.5}.myth-col button.on{opacity:1;border-color:#c9a24a}.myth-col .mar{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.myth-col .mar button{border-radius:10px;padding:4px;opacity:.45;aspect-ratio:1}.myth-col .mar button.on{opacity:1}.myth-col .mar svg{width:100%;height:100%;display:block}.myth-col p{margin:.6em 0 0;opacity:.6;font-size:12px}";
 document.head.appendChild(st);
 document.addEventListener("click",function(e){var t=e.target;if(!t.closest)return;
  var p=t.closest("[data-mypat]");if(p){e.stopPropagation();var pl=MYPAT[+p.dataset.mypat],i=(+p.dataset.i+1)%pl.length;var id=pl[+p.dataset.i];myGodCard(id);p.dataset.i=i;p.textContent="Покровитель: "+MYGOD[pl[i]][1]+" ›";return}
  var a=t.closest("[data-myart]");if(a){e.stopPropagation();myArtCard(+a.dataset.myart);return}
  var ga=t.closest("[data-mygod]");if(ga){myGodCard(ga.dataset.mygod);return}
  var ar=t.closest("[data-myartc]");if(ar){myArtCard(+ar.dataset.myartc);return}
 },true);
 document.addEventListener("keydown",function(e){var t=e.target;if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName))return;if(e.key.length!==1)return;window._kb=((window._kb||"")+e.key.toLowerCase()).slice(-10);
  for(var k in MYKEY)if(window._kb.slice(-k.length)===k){myGodCard(MYKEY[k]);window._kb="";break}});
 var _rb=renderBig;renderBig=function(){_rb();try{var inf=document.querySelector("#big .info"),th=getT(cur);if(!inf||!th||th.n!=="Мифы"||document.querySelector("#big .myth-col"))return;var fd=myFound(),h='<div class="myth-col"><h4>Пантеон и артефакты</h4><div class="mgr">';
  for(var g in MYGOD)h+='<button data-mygod="'+g+'" class="'+(fd.indexOf(g)>=0?"on":"")+'">'+MYGOD[g][1]+'</button>';
  h+='</div><div class="mar" style="margin-top:.8em">';MYART.forEach(function(a,i){h+='<button data-myartc="'+i+'" title="'+a[0]+'" class="on">'+MYAS[a[1]]+'</button>'});
  h+='</div><p>Нажми на имя или значок, откроется карточка. Золотые имена: те, что ты уже открывал. Найдено тайн: '+fd.length+' из '+Object.keys(MYSEC).length+'.</p></div>';inf.insertAdjacentHTML("beforeend",h)}catch(x){}};
})();
/* Мифы: детальные артефакты, Кратос, Летопись Спарты, вороны в небе */
var MYOL="#17110c";
function mygr(id,st,a){a=a||[0,0,1,0];return '<linearGradient id="'+id+'" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+a[2]+'" y2="'+a[3]+'">'+st.map(function(s){return '<stop offset="'+s[0]+'" stop-color="'+s[1]+'"/>'}).join('')+'</linearGradient>'}
function myrg(id,st){return '<radialGradient id="'+id+'" cx=".35" cy=".3" r=".85">'+st.map(function(s){return '<stop offset="'+s[0]+'" stop-color="'+s[1]+'"/>'}).join('')+'</radialGradient>'}
var MYSTEEL=[[0,"#f7faff"],[.35,"#b5c1d4"],[.72,"#6b778c"],[1,"#2e3645"]],MYGOLD=[[0,"#fff4b8"],[.35,"#eab84a"],[.72,"#a8741c"],[1,"#5d3b0a"]],MYWOOD=[[0,"#a07240"],[.5,"#5e3b1e"],[1,"#2d1b0d"]],MYLEA=[[0,"#7a5640"],[1,"#2b1a10"]];
var MYGLOW='<filter id="mgGl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
function mysv(defs,body){return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>'+defs+'</defs>'+body+'</svg>'}
function myFeather(x,y,len,w,ang,fill){return '<path transform="translate('+x+' '+y+') rotate('+ang+')" d="M0 0C'+w+' '+(-len*.3)+' '+w+' '+(-len*.82)+' 0 '+(-len)+'C'+(-w)+' '+(-len*.82)+' '+(-w)+' '+(-len*.3)+' 0 0Z" fill="'+fill+'" stroke="#7f8fae" stroke-width=".8"/><path transform="translate('+x+' '+y+') rotate('+ang+')" d="M0 -2V'+(-len*.85)+'" stroke="#a9b6cf" stroke-width=".6"/>'}
var MYAS2={};
MYAS2.draupnir=mysv(mygr("d1",MYGOLD,[0,0,0,1])+mygr("d2",MYGOLD,[0,0,1,1]),
 '<ellipse cx="32" cy="29" rx="20" ry="13.5" fill="none" stroke="'+MYOL+'" stroke-width="11"/><ellipse cx="32" cy="29" rx="20" ry="13.5" fill="none" stroke="url(#d1)" stroke-width="8.6"/><ellipse cx="32" cy="29" rx="20" ry="13.5" fill="none" stroke="#6a4510" stroke-width="8.6" stroke-dasharray="1.5 3.6" opacity=".6"/><path d="M14 23Q24 11 42 14" fill="none" stroke="#fff6c4" stroke-width="1.7" opacity=".9" stroke-linecap="round"/><path d="M20 38Q32 45 46 39" fill="none" stroke="#3d2606" stroke-width="1.2" opacity=".45"/>'
 +[[13,50],[32,56],[51,50]].map(function(p){return '<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="6" ry="3.3" fill="none" stroke="'+MYOL+'" stroke-width="3.6"/><ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="6" ry="3.3" fill="none" stroke="url(#d2)" stroke-width="2.4"/>'}).join('')
 +'<path d="M54 6v10M49 11h10M10 6v7M6.5 9.5h7" stroke="#fff8d0" stroke-width="1.2" stroke-linecap="round"/>');
MYAS2.gjallar=mysv(mygr("h1",[[0,"#fffbe8"],[.4,"#d8c89c"],[.8,"#8f7d52"],[1,"#4a3b1f"]],[0,0,1,1])+mygr("h2",MYGOLD,[0,0,1,1])+'<clipPath id="hc"><path d="M6 57C3 26 26 8 58 12C52 16 46 22 42 30C34 44 24 52 12 61Z"/></clipPath>',
 '<path d="M6 57C3 26 26 8 58 12C52 16 46 22 42 30C34 44 24 52 12 61Z" fill="url(#h1)" stroke="'+MYOL+'" stroke-width="1.6" stroke-linejoin="round"/><g clip-path="url(#hc)"><path d="M14 62C26 52 36 44 44 28C48 20 54 14 62 10L62 64Z" fill="#5a4a28" opacity=".35"/><path d="M36 2L58 34" stroke="'+MYOL+'" stroke-width="6.6"/><path d="M36 2L58 34" stroke="url(#h2)" stroke-width="5"/><path d="M0 18L28 46" stroke="'+MYOL+'" stroke-width="5.6"/><path d="M0 18L28 46" stroke="url(#h2)" stroke-width="4"/><path d="M0 40L16 58" stroke="'+MYOL+'" stroke-width="5.6"/><path d="M0 40L16 58" stroke="url(#h2)" stroke-width="4"/></g><path d="M9 44C9 28 24 15 47 13" fill="none" stroke="#fffdf0" stroke-width="1.4" opacity=".8" stroke-linecap="round"/><ellipse cx="58" cy="12" rx="2.6" ry="6.4" transform="rotate(-24 58 12)" fill="#1a120a" stroke="url(#h2)" stroke-width="1.2"/><path d="M20 30l4 3M26 24l4 3M32 19l3 3.4" stroke="#6b5a38" stroke-width=".9" opacity=".8"/>');
MYAS2.gungnir=mysv(mygr("g1",MYSTEEL.slice().reverse().map(function(s,i){return [i/3,s[1]]})).replace('</linearGradient>','</linearGradient>')+mygr("g2",[[0,"#8a97ad"],[.45,"#f6f9ff"],[.55,"#c5d0e1"],[1,"#566277"]])+mygr("g3",MYWOOD)+mygr("g4",MYGOLD),
 '<g transform="rotate(38 32 32) translate(-.6 -.4) scale(1.02)"><path d="M30 28h4v33l-2 4-2-4z" fill="url(#g3)" stroke="'+MYOL+'" stroke-width="1.2"/><g stroke="'+MYOL+'" stroke-width="1"><rect x="28.6" y="34" width="6.8" height="3" fill="url(#g4)"/><rect x="28.6" y="46" width="6.8" height="3" fill="url(#g4)"/><rect x="29" y="58" width="6" height="2.6" fill="url(#g4)"/></g><path d="M30.5 38l3 4M30.5 41l3 4" stroke="#1b110a" stroke-width=".8"/><rect x="27.6" y="22" width="8.8" height="6.4" rx="1.4" fill="url(#g4)" stroke="'+MYOL+'" stroke-width="1.1"/><path d="M32 0C41 8 42.4 19 36.6 23.4H27.4C21.6 19 23 8 32 0Z" fill="url(#g2)" stroke="'+MYOL+'" stroke-width="1.2" stroke-linejoin="round"/><path d="M32 3V23" stroke="#323c4e" stroke-width=".9"/><path d="M28.6 9.5h6.8M27.6 13.6h8.8M28 17.8h8" stroke="#e8b84a" stroke-width=".8"/></g>');
MYAS2.mjolnir=mysv(mygr("m1",[[0,"#cdd7e8"],[.5,"#7d899f"],[1,"#434d5f"]],[0,0,0,1])+mygr("m2",[[0,"#f2f6fd"],[1,"#98a4b9"]],[0,0,0,1])+mygr("m3",[[0,"#4a5365"],[1,"#232a37"]],[0,0,1,0])+mygr("m4",MYLEA,[0,0,1,0])+mygr("m5",MYGOLD),
 '<g transform="rotate(-13 32 34)"><rect x="27" y="36" width="9" height="22" rx="1.4" fill="url(#m4)" stroke="'+MYOL+'" stroke-width="1.2"/><path d="M27 41l9 3M27 46l9 3M27 51l9 3" stroke="'+MYOL+'" stroke-width="1.5"/><path d="M27 40l9 3M27 45l9 3M27 50l9 3" stroke="#9a7456" stroke-width=".7" opacity=".7"/><rect x="26" y="35" width="11" height="3.4" rx="1" fill="url(#m5)" stroke="'+MYOL+'" stroke-width="1"/><ellipse cx="31.5" cy="59.4" rx="4.4" ry="3" fill="none" stroke="'+MYOL+'" stroke-width="3.2"/><ellipse cx="31.5" cy="59.4" rx="4.4" ry="3" fill="none" stroke="url(#m5)" stroke-width="1.8"/>'
 +'<polygon points="8,18 46,18 46,37 8,37" fill="url(#m1)" stroke="'+MYOL+'" stroke-width="1.3" stroke-linejoin="round"/><polygon points="8,18 17,10 55,10 46,18" fill="url(#m2)" stroke="'+MYOL+'" stroke-width="1.3" stroke-linejoin="round"/><polygon points="46,18 55,10 55,29 46,37" fill="url(#m3)" stroke="'+MYOL+'" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 19.4H45M11 11.4L18 11" stroke="#fff" stroke-width=".9" opacity=".7"/><path d="M13 25l2.6 6M20 23v9M26 24l4 6m-4 0l4-6M34 23v9l4-4.4M42 24v8" stroke="#f0c050" stroke-width="1.2" stroke-linecap="round" opacity=".95"/><path d="M9 34l6-1M31 21l7 .6M36 35l8-1.4" stroke="#2b3342" stroke-width=".7" opacity=".7"/></g>');
MYAS2.skid=mysv(mygr("s1",[[0,"#b9824a"],[1,"#5a381b"]],[0,0,0,1])+mygr("s2",[[0,"#48a0e0"],[1,"#1c4b82"]],[0,0,0,1])+'<clipPath id="sc"><path d="M18 11Q32 17 46 11L44 31Q32 36 20 31Z"/></clipPath>',
 '<path d="M32 4V34" stroke="'+MYOL+'" stroke-width="3"/><path d="M32 4V34" stroke="#7a5230" stroke-width="1.6"/><path d="M32 5L8 33M32 5L57 33" stroke="#3b2411" stroke-width=".8"/><rect x="17" y="9.6" width="30" height="2.2" rx="1" fill="#6b4524" stroke="'+MYOL+'" stroke-width=".8"/>'
 +'<path d="M18 11Q32 17 46 11L44 31Q32 36 20 31Z" fill="#efe3c2"/><g clip-path="url(#sc)" fill="#b8312a"><rect x="21" y="8" width="4.4" height="30"/><rect x="29.8" y="8" width="4.4" height="30"/><rect x="38.6" y="8" width="4.4" height="30"/></g><path d="M18 11Q32 17 46 11L44 31Q32 36 20 31Z" fill="none" stroke="'+MYOL+'" stroke-width="1.1"/><path d="M22 14Q32 18 42 14" stroke="#fff" stroke-width=".6" opacity=".5" fill="none"/>'
 +'<path d="M3 38Q9 53 32 53T61 36L56.4 33H9z" fill="url(#s1)" stroke="'+MYOL+'" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 41Q32 49 58 38M11 46Q32 51 54 43" fill="none" stroke="#33200f" stroke-width=".8"/><path d="M8 33h48l-1.2 3.4H9.6z" fill="#8a2d24" stroke="'+MYOL+'" stroke-width=".9"/>'
 +[15,23,31,39,47].map(function(x,i){return '<circle cx="'+x+'" cy="34.8" r="2.7" fill="'+(i%2?"#e8c04a":"#c8352b")+'" stroke="'+MYOL+'" stroke-width=".9"/><circle cx="'+x+'" cy="34.8" r=".8" fill="#fff6c4"/>'}).join('')
 +'<path d="M56.4 33C62.4 31 64 23 60 17C61 24 58.6 27.4 54 28.6Z" fill="#7a5230" stroke="'+MYOL+'" stroke-width="1.1"/><path d="M58 18.4C60 14 63.6 15 63.6 17.6C63 19 60 19.6 58 18.4Z" fill="#8f5f33" stroke="'+MYOL+'" stroke-width="1"/><circle cx="60.6" cy="16.8" r=".8" fill="#ffd04a"/><path d="M9 33C3.4 33 1.6 28 3.4 23.6C5.6 27.4 7.6 28.4 12 28.6Z" fill="#7a5230" stroke="'+MYOL+'" stroke-width="1.1"/>'
 +'<path d="M0 54q5-3 10 0t10 0 10 0 10 0 10 0 10 0 4-1V64H0z" fill="url(#s2)"/><path d="M2 57q4-2 8 0M24 59q4-2 8 0M44 57q4-2 8 0" stroke="#bfe4ff" stroke-width=".9" fill="none" opacity=".75"/>');
(function(){var a="",n=12;for(var k=0;k<n;k++){var an=(k/n)*6.283+.2,c=Math.cos(an),s=Math.sin(an),x0=32+c*10.5,y0=32+s*10.5,x1=32+c*21,y1=32+s*21,cx=32+c*16-s*5*(k%2?1:-1),cy=32+s*16+c*5*(k%2?1:-1);
 a+='<path d="M'+x0.toFixed(1)+' '+y0.toFixed(1)+'Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+x1.toFixed(1)+' '+y1.toFixed(1)+'" fill="none" stroke="'+MYOL+'" stroke-width="3.6" stroke-linecap="round"/><path d="M'+x0.toFixed(1)+' '+y0.toFixed(1)+'Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+x1.toFixed(1)+' '+y1.toFixed(1)+'" fill="none" stroke="#6fa04e" stroke-width="2.2" stroke-linecap="round"/><circle cx="'+x1.toFixed(1)+'" cy="'+y1.toFixed(1)+'" r="1.7" fill="#9ccf6a" stroke="'+MYOL+'" stroke-width=".7"/>'}
 MYAS2.aegis=mysv(myrg("a1",[[0,"#f8cd96"],[.45,"#c07a35"],[1,"#5f3010"]])+myrg("a2",[[0,"#fbf2d6"],[1,"#c3ae78"]]),
 '<circle cx="32" cy="32" r="31" fill="'+MYOL+'"/><circle cx="32" cy="32" r="29.6" fill="url(#a1)"/><circle cx="32" cy="32" r="27" fill="none" stroke="#5f3010" stroke-width="1.2"/><circle cx="32" cy="32" r="24.4" fill="none" stroke="#7a431a" stroke-width="3.6" stroke-dasharray="3.2 2.2"/><circle cx="32" cy="32" r="22" fill="none" stroke="#f3c68c" stroke-width=".8" opacity=".7"/>'+a
 +'<circle cx="32" cy="33" r="12.4" fill="url(#a2)" stroke="'+MYOL+'" stroke-width="1.3"/><path d="M24.4 27.4l5 2.4M39.6 27.4l-5 2.4" stroke="'+MYOL+'" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="27.6" cy="31.8" rx="2.5" ry="1.8" fill="#2a1d14"/><ellipse cx="36.4" cy="31.8" rx="2.5" ry="1.8" fill="#2a1d14"/><circle cx="26.9" cy="31.2" r=".7" fill="#fff"/><circle cx="35.7" cy="31.2" r=".7" fill="#fff"/><path d="M31 33.4l-1 4.4h4z" fill="#b59a60" stroke="#6b5a38" stroke-width=".5"/><path d="M24.6 38.6Q32 44.6 39.4 38.6Q32 41.4 24.6 38.6Z" fill="#3a1410" stroke="'+MYOL+'" stroke-width=".8"/><path d="M27.4 40.2l1.1 2.6 1.1-2.2M34.6 40.2l-1.1 2.6-1.1-2.2" fill="#fff" stroke="#6b5a38" stroke-width=".4"/>')}());
MYAS2.sandals=mysv(mygr("t1",[[0,"#f7d17a"],[1,"#8a5a14"]],[0,0,0,1])+mygr("t2",MYLEA,[0,0,0,1])+mygr("t3",[[0,"#ffffff"],[1,"#c6d2e8"]],[0,0,0,1]),
 [[17,44,26,10,-72],[17,44,30,10.4,-52],[17,44,29,10,-33],[17,44,24,9,-14],[18,46,20,8,-62],[18,46,22,8,-42],[18,46,18,7,-22]].map(function(f){return myFeather(f[0],f[1],f[2],f[3],f[4],"url(#t3)")}).join('')
 +'<path d="M12 48Q10 43 17 42H46Q56 42 58 48Q56 55 47 55H17Q12 55 12 48Z" fill="url(#t1)" stroke="'+MYOL+'" stroke-width="1.3"/><path d="M15 45H50" stroke="#fff4b8" stroke-width=".8" opacity=".7"/><path d="M18 42C19 34 24 28 30 22L36 25C34 31 33 36 34 42Z" fill="url(#t2)" stroke="'+MYOL+'" stroke-width="1.2" stroke-linejoin="round"/><path d="M36 42C38 36 42 33 47 31L51 36C48 38 46 41 46 42Z" fill="url(#t2)" stroke="'+MYOL+'" stroke-width="1.2" stroke-linejoin="round"/><path d="M20 38l14-6M26 30l7 9M19 41l14-2" stroke="#1b110a" stroke-width="1"/><circle cx="31" cy="26" r="2.3" fill="url(#t1)" stroke="'+MYOL+'" stroke-width=".9"/><circle cx="31" cy="26" r=".8" fill="#fff4b8"/><rect x="26" y="19" width="8.4" height="3.4" rx="1" fill="url(#t1)" stroke="'+MYOL+'" stroke-width=".9" transform="rotate(25 30 20)"/>');
MYAS2.pithos=mysv(mygr("p1",[[0,"#6e4c2e"],[1,"#3a2616"]],[0,0,1,1])+mygr("p2",[[0,"#f4cc72"],[.5,"#b47a24"],[1,"#5d3b0a"]],[0,0,0,1])+'<polygon id="pk" points="0,0"/>'+MYGLOW,
 '<polygon points="32,36 54,24 54,47 32,59" fill="#1b212d" stroke="'+MYOL+'" stroke-width="1.2"/><polygon points="32,36 10,24 10,47 32,59" fill="#2c3646" stroke="'+MYOL+'" stroke-width="1.2"/><polygon points="32,11 54,24 32,36 10,24" fill="url(#p1)" stroke="'+MYOL+'" stroke-width="1.2" stroke-linejoin="round"/>'
 +'<path d="M12 27l18 10.4V54L12 43.6zM52 27L34 37.4V54l18-10.4z" fill="none" stroke="#4fe0ff" stroke-width="1" opacity=".95" filter="url(#mgGl)"/><path d="M15.6 31.6l4.8 2.8v7.4l-4.8-2.8zM48.4 31.6l-4.8 2.8v7.4l4.8-2.8z" fill="none" stroke="#4fe0ff" stroke-width=".8" opacity=".9" filter="url(#mgGl)"/><path d="M24.4 40.6l3 1.7M24.4 45l3 1.7M39.6 40.6l-3 1.7M39.6 45l-3 1.7" stroke="#4fe0ff" stroke-width=".8" opacity=".85" filter="url(#mgGl)"/>'
 +'<path d="M32 11L54 24M32 11L10 24M10 24L32 36L54 24" fill="none" stroke="url(#p2)" stroke-width="2.2" stroke-linejoin="round"/><path d="M32 36V59M10 24V47M54 24V47" stroke="url(#p2)" stroke-width="2.2"/><path d="M10 47L32 59L54 47" fill="none" stroke="url(#p2)" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="32" cy="23.6" rx="10.4" ry="5.6" fill="none" stroke="#c99538" stroke-width="1.4"/><ellipse cx="32" cy="23.6" rx="5" ry="2.7" fill="#241a0e" stroke="#e6b345" stroke-width="1"/><ellipse cx="32" cy="23.2" rx="2" ry="1.1" fill="#4fe0ff" filter="url(#mgGl)"/><g fill="url(#p2)" stroke="'+MYOL+'" stroke-width=".7"><circle cx="32" cy="11" r="1.9"/><circle cx="10" cy="24" r="1.9"/><circle cx="54" cy="24" r="1.9"/><circle cx="32" cy="59" r="1.9"/></g>');
MYAS2.fleece=(function(){var c="",i,j,pts=[];for(j=0;j<7;j++){var y=17+j*6.2,w=j<1?11:j<2?17:j<5?21:j<6?17:11;var n=Math.round(w/4.4)+1;for(i=0;i<n;i++){var x=32+(i-(n-1)/2)*(2*w/Math.max(1,n-1))*.96+(j%2?2.2:-2.2)*.5;pts.push([x,y+Math.sin(i*2.3+j)*1.2,4.6+((i*7+j*3)%5)*.28])}}
 pts.forEach(function(p){c+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+p[2].toFixed(1)+'" fill="url(#f1)" stroke="#6b4310" stroke-width=".8"/><path d="M'+(p[0]-p[2]*.45).toFixed(1)+' '+(p[1]-p[2]*.1).toFixed(1)+'q'+(p[2]*.45).toFixed(1)+' -'+(p[2]*.6).toFixed(1)+' '+(p[2]*.9).toFixed(1)+' 0" fill="none" stroke="#fff6c4" stroke-width=".7" opacity=".85"/>'});
 return mysv(myrg("f1",[[0,"#fff1a8"],[.5,"#e0aa3c"],[1,"#8a5a14"]])+mygr("f2",MYWOOD,[0,0,0,1]),
 '<path d="M2 8Q32 2 62 8" fill="none" stroke="'+MYOL+'" stroke-width="4.4" stroke-linecap="round"/><path d="M2 8Q32 2 62 8" fill="none" stroke="url(#f2)" stroke-width="3" stroke-linecap="round"/><path d="M24 8L28 17M40 8L36 17" stroke="#6b4524" stroke-width="1.4"/><g fill="#a8741c" stroke="'+MYOL+'" stroke-width=".9"><ellipse cx="12" cy="20" rx="4" ry="5.6" transform="rotate(25 12 20)"/><ellipse cx="52" cy="20" rx="4" ry="5.6" transform="rotate(-25 52 20)"/><ellipse cx="14" cy="54" rx="4" ry="5" transform="rotate(-20 14 54)"/><ellipse cx="50" cy="54" rx="4" ry="5" transform="rotate(20 50 54)"/></g>'+c+'<ellipse cx="26" cy="26" rx="10" ry="6" fill="#fff" opacity=".12" transform="rotate(-20 26 26)"/>')})();
MYAS2.thread=mysv(myrg("r1",[[0,"#f07a62"],[.5,"#b3302a"],[1,"#4a0f0c"]])+'<clipPath id="rc"><circle cx="24" cy="38" r="17"/></clipPath>',
 '<path d="M6 7h52v50M58 57H10V13h40v38H16V19h28v26" fill="none" stroke="#c9a24a" stroke-width="1.2" opacity=".28"/><path d="M41 38C49 38 46 29 53 29S61 39 55 45 47 55 57 59" fill="none" stroke="'+MYOL+'" stroke-width="4.4" stroke-linecap="round"/><path d="M41 38C49 38 46 29 53 29S61 39 55 45 47 55 57 59" fill="none" stroke="#c63a30" stroke-width="2.8" stroke-linecap="round"/><path d="M43 37C49 36 47 31 52 30" fill="none" stroke="#ff9a82" stroke-width=".8" opacity=".8"/>'
 +'<circle cx="24" cy="38" r="18" fill="'+MYOL+'"/><circle cx="24" cy="38" r="17" fill="url(#r1)"/><g clip-path="url(#rc)" fill="none" stroke-linecap="round">'+[-70,-40,-10,20,50,80].map(function(a){return '<ellipse cx="24" cy="38" rx="17.5" ry="8.6" transform="rotate('+a+' 24 38)" stroke="#4a0f0c" stroke-width="1.6"/><ellipse cx="24" cy="38" rx="17.5" ry="8.6" transform="rotate('+a+' 24 38)" stroke="#e8624c" stroke-width=".9" stroke-dasharray="5 2.4" opacity=".8"/>'}).join('')+'</g><ellipse cx="18" cy="30" rx="6" ry="3.2" fill="#fff" opacity=".22" transform="rotate(-35 18 30)"/><circle cx="57" cy="59" r="2" fill="#e0aa3c" stroke="'+MYOL+'" stroke-width=".8"/>');
(function(){var bl='<path d="M32 2C37.4 10 40.4 24 38.6 41L35 46H29L28 42L24.8 40L27 36L24 33L26.2 29L24 25C25 14 28 7 32 2Z" fill="url(#b1)" stroke="'+MYOL+'" stroke-width="1.2" stroke-linejoin="round"/><path d="M32 2C37.4 10 40.4 24 38.6 41" fill="none" stroke="#ff6a1a" stroke-width="2.2" filter="url(#mgGl)"/><path d="M32 4C37 11 39.4 24 37.8 40" fill="none" stroke="#ffd04a" stroke-width=".8"/><path d="M31.6 8C31 18 31.6 30 32.6 42" fill="none" stroke="#5d6a7e" stroke-width=".7"/><path d="M26.4 43L37.6 43L41 47.4L36.4 50.4H28.4L23.6 47.4Z" fill="url(#b2)" stroke="'+MYOL+'" stroke-width="1.1" stroke-linejoin="round"/><rect x="29" y="50" width="6" height="9" rx="1" fill="#4a2e1e" stroke="'+MYOL+'" stroke-width="1"/><path d="M29 52.6l6 1.6M29 55.6l6 1.6" stroke="#1b110a" stroke-width="1"/>';
 MYAS2.blades=mysv(mygr("b1",[[0,"#6e7a8e"],[.5,"#f4f8ff"],[1,"#8a96a8"]])+mygr("b2",MYGOLD,[0,0,0,1])+MYGLOW,
 '<g transform="translate(-1 -1) rotate(-26 32 56) scale(.96)">'+bl+'</g><g transform="translate(64 -1) scale(-1 1) rotate(-26 32 56) scale(.96)">'+bl+'</g><path d="M22 58Q32 67 42 58" fill="none" stroke="'+MYOL+'" stroke-width="3.2" stroke-dasharray="3 1.4" stroke-linecap="round"/><path d="M22 58Q32 67 42 58" fill="none" stroke="#ff7a2a" stroke-width="1.6" stroke-dasharray="3 1.4" stroke-linecap="round" filter="url(#mgGl)"/>')}());
MYAS2.leviathan=mysv(mygr("l1",[[0,"#ffffff"],[.4,"#c4d8ee"],[1,"#5f7ea3"]],[0,0,1,1])+mygr("l2",MYWOOD)+mygr("l3",MYSTEEL,[0,0,0,1])+mygr("l4",MYGOLD,[0,0,1,1])+MYGLOW,
 '<g transform="rotate(30 32 32) translate(0 1)"><rect x="30" y="8" width="4" height="55" rx="1.2" fill="url(#l2)" stroke="'+MYOL+'" stroke-width="1.1"/><g fill="#2b1a10" stroke="'+MYOL+'" stroke-width=".6"><rect x="29.4" y="26" width="5.2" height="4"/><rect x="29.4" y="40" width="5.2" height="4"/><rect x="29.4" y="54" width="5.2" height="4"/></g><path d="M32 31.4v6M32 45.4v6M32 58.6v3" stroke="#7fe8ff" stroke-width="1.3" stroke-linecap="round" filter="url(#mgGl)"/><path d="M30 4C10 4 2 21 5 37C14 32.6 23 31.4 30 31.4Z" fill="url(#l1)" stroke="'+MYOL+'" stroke-width="1.3" stroke-linejoin="round"/><path d="M28 9C14 9 8.6 21 9.6 31" fill="none" stroke="#3f5878" stroke-width=".9"/><path d="M5 37C2 21 10 4 30 4" fill="none" stroke="#8fe8ff" stroke-width="1.3" filter="url(#mgGl)" opacity=".9"/><path d="M13 15l1.8 2.6M18 12l1 3M10 22l2 2.4" stroke="#5d7ea6" stroke-width=".9"/><path d="M34 11L47 8.6L50 15.6L34 20Z" fill="url(#l3)" stroke="'+MYOL+'" stroke-width="1.1" stroke-linejoin="round"/><path d="M36 12L46 10.4" stroke="#fff" stroke-width=".7" opacity=".7"/><rect x="28" y="19" width="8" height="9" rx="1.6" fill="url(#l4)" stroke="'+MYOL+'" stroke-width="1.1"/><circle cx="32" cy="23.4" r="2.1" fill="#12202c" stroke="#7fe8ff" stroke-width=".8" filter="url(#mgGl)"/><path d="M4 38l-2 3 3 1zM7 40l-1 4 3-1.4z" fill="#9fe6ff" opacity=".85"/></g>');
for(var _k in MYAS2)MYAS[_k]=MYAS2[_k];
MYAS.pithos=MYAS2.pithos;
MYART[7]=["Ящик Пандоры","pithos","ᛈᚨᚾᛞᛟᚱᚨ","В God of War III в нём осталась надежда. Кратос выпускает её, пронзив себя Клинком Олимпа.","Пандора"];
MYART[10]=["Клинки Хаоса","blades","ᚲᛚᛁᚾᚲᛁ","Клинки на цепях, которые Арес приковал к рукам Кратоса. Он носит их с первой игры.","Кратос"];
MYART[11]=["Топор Левиафан","leviathan","ᛚᛖᚢᛁᚨᚦᚨᚾ","Топор Фэй. Ледяной клинок, на древке руны Тюра. Возвращается в руку по зову.","Кратос"];
MYART.push(["Клинок Олимпа","bolimp","ᛟᛚᚢᛗᛈᛟᛊ","Меч, выкованный богами, чтобы убить Титанов. Кратос получает его в God of War II от Зевса, чтобы бросить против Колосса.","Кратос"]);
MYAS.bolimp=mysv(mygr("o1",[[0,"#f7faff"],[.4,"#b9c5d8"],[1,"#5f6c80"]])+mygr("o2",MYGOLD,[0,0,0,1])+mygr("o3",MYLEA,[0,0,1,0]),
 '<g transform="rotate(40 32 32) translate(0 1)"><path d="M32 0C36 6 37.6 16 36.6 36H27.4C26.4 16 28 6 32 0Z" fill="url(#o1)" stroke="'+MYOL+'" stroke-width="1.2" stroke-linejoin="round"/><path d="M32 3V36" stroke="#4a566a" stroke-width=".9"/><path d="M29.6 12h4.8M29.2 18h5.6M29 24h6" stroke="#5d6a7e" stroke-width=".7"/><path d="M14 36Q14 32 20 32H44Q50 32 50 36Q50 40 44 40H20Q14 40 14 36Z" fill="url(#o2)" stroke="'+MYOL+'" stroke-width="1.2"/><path d="M20 36h24" stroke="#5d3b0a" stroke-width=".8"/><circle cx="32" cy="36" r="2.4" fill="#2a1d14" stroke="#fff4b8" stroke-width=".7"/><rect x="29" y="40" width="6" height="14" rx="1.2" fill="url(#o3)" stroke="'+MYOL+'" stroke-width="1.1"/><path d="M29 44l6 2M29 48l6 2" stroke="#1b110a" stroke-width="1"/><path d="M28 54h8l-1.4 5.6h-5.2z" fill="url(#o2)" stroke="'+MYOL+'" stroke-width="1.1"/></g>');
MYSEC["art12"]="Клинок Олимпа";
/* Кратос и покровители */
MYGOD.kratos=["ᚲᚱᚨᛏᛟᛊ","Кратос","Призрак Спарты",["Спартанец, ставший богом войны. Пепел жены и дочери остался на его коже: отсюда прозвище.","В играх 2018 и 2022 годов он уже отец и воин Мидгарда."],"Ошибся: исправь. Извинения потом."];
MYSEC.kratos="Кратос";MYKEY.kratos="kratos";MYKEY.boy="kratos";
MYPAT[0]=["kratos","odin","thor"];MYPAT[2]=["kratos","athena","ares","atreus"];
/* Летопись Спарты */
var MYCHR=[
 ["God of War: Ascension","ᚨᛊᚲᛖᚾᛊᛁᛟᚾ","Кратоса мучают видения гибели семьи. Виноваты Фурии. Он убивает Мегеру, Тисифону и Алекто, а Очи Правды помогают ему разрушать их иллюзии. Орк, сын Ареса, говорит: видения кончатся, только если убить бога, который их послал."],
 ["God of War: Chains of Olympus","ᚲᚺᚨᛁᚾᛊ","Кратос служит богам Олимпа и надеется, что они избавят его от кошмаров. Морфей и Персефона похищают Гелиоса. Персефона обещает вернуть душу дочери Каллиопы, но на деле хочет с Атласом обрушить Олимп. Кратос убивает Персефону, Атлас остаётся держать мир, Гелиос свободен."],
 ["God of War (2005)","ᚷᛟᛞ","Олимпийцы отправляют Кратоса остановить Ареса. Из воспоминаний ясно: Арес обманом заставил его убить жену и дочь. Кратос достаёт ящик Пандоры и убивает Ареса, но кошмары не уходят, и он бросается с вершины. Его останавливают и делают новым богом войны."],
 ["God of War: Ghost of Sparta","ᚷᚺᛟᛊᛏ","Кратос правит как бог войны, и боги недовольны. Он ищет мать Каллисто: она превращена в чудовище, и ему приходится её убить. Он узнаёт, что брата Деймоса держит в плену Танатос. Кратос топит Атлантиду, спускается в царство смерти. Деймос гибнет, и Кратос убивает Танатоса."],
 ["God of War: Betrayal","ᛒᛖᛏᚱᚨᛃ","Кратос идёт войной по Греции, и боги присылают гиганта Аргоса. Аргоса убивает неизвестный и подставляет Кратоса. Он гонится за убийцей. Зевс шлёт вестника Керика с предупреждением, Кратос убивает Керика, и настоящий убийца уходит. Игра выходила на телефонах, концовка открытая."],
 ["God of War II","ᛁᛁ","Зевс лишает Кратоса сил и убивает Клинком Олимпа. Гея возвращает его из Подземного мира. Кратос убивает Сестёр судьбы и меняет прошлое. Афина закрывает собой Зевса, умирает и просит не убивать отца. Кратос возвращает Титанов в расцвет сил, и они идут на Олимп."],
 ["God of War III","ᛁᛁᛁ","Кратос на Гее штурмует Олимп. Гибнут Посейдон, Аид, Гелиос, Гермес, Геракл, Гера, Гефест, Кронос. В финале Клинок Олимпа убивает Зевса. Афина требует силы, что он поглотил, но Кратос пронзает себя клинком, и надежда возвращается людям. Афина недовольна."],
 ["God of War (2018)","ᚾᛟᚱᛞ","Кратос и сын Атрей несут прах Фэй на высочайшую вершину девяти миров. Встречают Брока и Синдри, Ёрмунганда, Мимира, Фрейю. Кратос убивает Магни и Бальдра, Атрей убивает Моди. В Ётунхейме они узнают: Фэй была великаншей, а Атрея великаны зовут Локи. Начинается Фимбулвинтер."],
 ["God of War Ragnarök","ᚱᚨᚷᚾᚨ","Кратос и Атрей ищут правду о пророчестве и сражаются с Одином. Кратос убивает Хеймдалля. Тюр оказывается Одином в обличье, он убивает Брока. После атаки на Асгард Тор погибает от руки Одина, Одина добивают союзники, Асгард рушится. Кратос выживает, Атрей уходит восстанавливать великанов."],
 ["God of War Ragnarök: Valhalla","ᚢᚨᛚᚺᚨᛚᛚᚨ","Эпилог после Ragnarök. В Вальхалле Кратос теряет силы и оружие и проходит испытания Тюра, в том числе видения прошлого. В конце он встречает юного себя на троне бога войны, прощает его и соглашается стать богом войны, но Надежды и Мира."]
];
function myChrCard(i){var c=MYCHR[i],need=(i+1)*4;if(MYD.lore<need){myToast("ᚲᛚᛟᛊᛖᛞ","Глава «"+c[0]+"» закрыта. Нужно предания: "+need+", у тебя "+Math.round(MYD.lore)+".");return}
 myCard('<div class="myth-gi">'+c[1]+'</div>',"Глава "+(i+1)+" · "+c[0],c[1],c[2],"Летопись Спарты. Пересказ своими словами, без цитат.","chr"+i)}
for(var _c=0;_c<MYCHR.length;_c++)MYSEC["chr"+_c]=MYCHR[_c][0];
/* найденная тайна даёт +1 к преданиям */
var _mm=myMark;myMark=function(k){var n=_mm(k);if(n){MYD.lore=Math.min(40,MYD.lore+1);try{renderRowsDummy()}catch(e){}}return n};
MYD.lore=Math.min(40,MYD.lore+myFound().length);
/* интерфейс */
(function(){
 var f=LY.adam;
 LY.adam=function(th){var h=f(th);if(!th||!/^myth/.test(th.k))return h;
  var pg=RB?Math.min(ADPG,MYP.length-1):0,pl=MYPAT[pg];
  h=h.replace(/<button type="button" class="myth-pat"[\s\S]*?<\/button>/,'<div class="myth-pat">Покровители: '+pl.map(function(id){return '<button type="button" data-mygod="'+id+'">'+MYGOD[id][1]+'</button>'}).join('')+'</div>');
  h=h.replace('<div class="myth-runes"','<div class="myth-brk"></div><div class="myth-runes"');
  return h};
 var st=document.createElement("style");
 st.textContent=".ad-myth .ad-hd{flex-wrap:wrap;align-items:baseline}.ad-myth .ad-t{white-space:nowrap}.myth-brk{flex:0 0 100%;height:0}.ad-myth .myth-runes{flex:0 0 auto;margin-right:.7em}.ad-myth .myth-pat{flex:1 1 0;min-width:0}.myth-pat{display:flex;flex-wrap:wrap;gap:.3em .4em;align-items:center;margin:.1em 0 .2em;font:500 .68em ui-monospace,Consolas,monospace;color:var(--t);opacity:.85;cursor:default}.myth-pat button{padding:.1em .6em;border-radius:99px;border:1px solid color-mix(in srgb,var(--a) 70%,transparent);background:none;color:var(--a);font:inherit;cursor:pointer}.myth-pat button:hover{background:color-mix(in srgb,var(--a) 22%,transparent)}"
 +".myth-toast.card{display:grid!important;grid-template-columns:5.6em 1fr;gap:.9em;align-items:start;width:min(94%,33em)!important;max-width:none!important;top:4%!important;max-height:90%;overflow:hidden;box-sizing:border-box}.myth-toast .mc-ic{width:5.6em!important;height:5.6em!important;flex:none!important}.myth-toast .mc-tx{max-width:none}"
 +".myth-col .chr{display:flex;flex-direction:column;gap:5px;margin-top:.8em}.myth-col .chr button{border-radius:8px;text-align:left;opacity:1;padding:.35em .7em}.myth-col .chr button.lk{opacity:.4}"
 +".myth-fly{position:absolute;z-index:25;width:46px;height:30px;cursor:crosshair;animation:myfly 8s linear forwards;left:100%}.myth-fly svg{display:block;width:100%;height:100%;animation:myflap .32s ease-in-out infinite alternate;transform-origin:50% 60%}@keyframes myfly{to{left:-14%}}@keyframes myflap{from{transform:scaleY(1)}to{transform:scaleY(.55) translateY(3px)}}";
 document.head.appendChild(st);
 document.addEventListener("click",function(e){var t=e.target;if(!t.closest)return;
  var fl=t.closest(".myth-fly");if(fl){e.stopPropagation();fl.remove();MYD.ravens=Math.min(12,MYD.ravens+1);try{renderRowsDummy()}catch(x){}myToast("ᚺᚢᚷᛁᚾ","Ворон Одина пойман. Теперь у тебя "+Math.round(MYD.ravens)+" из 12.","flyraven");return}
  var ch=t.closest("[data-mychr]");if(ch){myChrCard(+ch.dataset.mychr);return}
  var rw=t.closest(".ad-row");if(rw&&/Предания/.test(rw.textContent)){var n=Math.min(MYCHR.length,Math.floor(MYD.lore/4));window._ci=((window._ci||0)%Math.max(1,n));myChrCard(window._ci);window._ci++;return}
 },true);
 MYSEC.konami="Код Спарты";
 function fly(){var L=document.querySelector("#big .lay.ad-myth");if(L&&!document.hidden&&!L.querySelector(".myth-fly")){var d=document.createElement("div");d.className="myth-fly";d.style.top=(10+Math.random()*22)+"%";d.title="Ворон Одина";
  d.innerHTML='<svg viewBox="0 0 46 30"><path d="M23 14C14 6 6 4 1 8C8 8 14 12 18 18Z" fill="#14161c"/><path d="M23 14C32 6 40 4 45 8C38 8 32 12 28 18Z" fill="#14161c"/><path d="M16 17C16 11 30 11 30 17C30 23 26 26 23 26C20 26 16 23 16 17Z" fill="#1d2029"/><path d="M29 15L36 17L29 19Z" fill="#cdbf9a"/><circle cx="26.6" cy="15" r="1" fill="#ff9a3c"/></svg>';L.appendChild(d);setTimeout(function(){d.remove()},8200)}
  }

 var kn=[],KC=["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight"];
 document.addEventListener("keydown",function(e){var t=e.target;if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName))return;kn.push(e.key);kn=kn.slice(-8);if(kn.join()===KC.join()){kn=[];myRage();myToast("ᚲᚱᚨᛏᛟᛊ","Код Спарты принят.","konami")}});
 var _rb=renderBig;renderBig=function(){_rb();try{var inf=document.querySelector("#big .info"),col=document.querySelector("#big .myth-col");if(!inf||!col||col.querySelector(".chr"))return;
  var h='<div class="chr">';MYCHR.forEach(function(c,i){var open=MYD.lore>=(i+1)*4;h+='<button data-mychr="'+i+'" class="'+(open?"":"lk")+'">'+(i+1)+'. '+c[0]+(open?'':' · закрыто')+'</button>'});h+='</div>';
  col.querySelector("h4").textContent="Пантеон, артефакты, Летопись";col.insertAdjacentHTML("beforeend",h)}catch(x){}};
})();
/* Мифы: артефакты по референсам из игр (Leviathan, Blades of Chaos, Blade of Olympus, Mjolnir) */
(function(){
var OL=MYOL;
var RUN='#38d8ff',ORG='#ff7a22';
var steel=mygr("z1",[[0,"#f3f6fb"],[.4,"#b7c0cf"],[.75,"#7b8699"],[1,"#434c5c"]],[0,0,1,1]);
var woodR=mygr("z2",[[0,"#9a4630"],[.5,"#6a2d1e"],[1,"#3a160e"]],[0,0,1,0]);
var gold=mygr("z3",MYGOLD,[0,0,1,1]),bronze=mygr("z4",[[0,"#f4c58a"],[.4,"#b9702f"],[1,"#5a2e0f"]],[0,0,1,1]);
var leather=mygr("z5",[[0,"#5a4a46"],[1,"#1f1816"]],[0,0,1,0]);
var glow='<filter id="zg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
/* Топор Левиафан */
MYAS.leviathan=mysv(steel+woodR+gold+leather+glow,
 '<g transform="rotate(36 32 32) translate(0 1.5)">'
 +'<path d="M29.4 8H34.6V58Q34.6 62 32 62Q29.4 62 29.4 58Z" fill="url(#z2)" stroke="'+OL+'" stroke-width="1.2"/><path d="M30.6 10V58" stroke="#c0654a" stroke-width=".7" opacity=".6"/>'
 +'<path d="M28.6 38H35.4V50H28.6Z" fill="url(#z5)" stroke="'+OL+'" stroke-width="1"/><path d="M28.6 40l6.8 2.4M28.6 43.4l6.8 2.4M28.6 46.8l6.8 2.4" stroke="#8a7c76" stroke-width="1"/><path d="M28.4 51.5h7.2v2.8h-7.2z" fill="url(#z3)" stroke="'+OL+'" stroke-width=".8"/><ellipse cx="32" cy="62" rx="3.6" ry="2.2" fill="#4a1f14" stroke="'+OL+'" stroke-width="1"/>'
 +'<path d="M33.4 6C46 1.6 60 6.6 61.4 19C62 27 57 33.6 50 37.6C46.4 30 40.8 27 33.4 27Z" fill="url(#z1)" stroke="'+OL+'" stroke-width="1.3" stroke-linejoin="round"/>'
 +'<path d="M34.6 8.4C45.6 5 57.6 9.4 58.6 19.4C59 25.6 55.4 30.4 50.6 33.6C46.6 28.2 41.6 25.8 35 25.2Z" fill="none" stroke="#5b6a82" stroke-width=".7"/>'
 +'<g fill="none" stroke="'+RUN+'" stroke-width="1.3" stroke-linecap="round" filter="url(#zg)"><path d="M37 14C43 11.4 51 12.6 55 18"/><path d="M39 20C44 18.6 50 20 53 24"/><path d="M42 16.6v4M46 14.6l2.4 3M49.6 21l-2 3M44 24l-3 -1.6"/><path d="M56 22C54.6 27 51.4 30 48 32"/></g>'
 +'<path d="M30.6 12.2L19 9.6C15.6 12 14 16 15.4 20L30.6 23Z" fill="url(#z1)" stroke="'+OL+'" stroke-width="1.2" stroke-linejoin="round"/><path d="M28 13.6L20 12" stroke="'+RUN+'" stroke-width=".9" filter="url(#zg)"/>'
 +'<rect x="27.6" y="5.6" width="8.8" height="22.4" rx="1.6" fill="url(#z3)" stroke="'+OL+'" stroke-width="1.1"/><path d="M27.8 11h8.4M27.8 22h8.4" stroke="#5d3b0a" stroke-width=".8"/><circle cx="32" cy="16.6" r="2.6" fill="#0f2430" stroke="#e0aa3c" stroke-width=".9"/><circle cx="32" cy="16.6" r="1.1" fill="'+RUN+'" filter="url(#zg)"/>'
 +'</g>');
/* Клинки Хаоса */
(function(){
 var bl=function(op){return '<g opacity="'+op+'">'
  +'<path d="M22 21.6C32 20 46 16.6 63 4C57 22 46 33 36 37L33 32.6L29.2 38.6L26 31.6L22 30.6Z" fill="url(#z1)" stroke="'+OL+'" stroke-width="1.3" stroke-linejoin="round"/>'
  +'<path d="M24 22.8C34 21.4 46 18.4 60 8" fill="none" stroke="#3a4352" stroke-width="1.4" stroke-linecap="round"/>'
  +'<path d="M27 29H42L45.4 25.2H55" fill="none" stroke="'+ORG+'" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" filter="url(#zg)"/>'
  +'<path d="M31 26.2l2 2.8-2 2.8-2-2.8zM39.6 26.2l1.6 2.8-1.6 2.8-1.6-2.8z" fill="#ffb347" filter="url(#zg)"/><path d="M33 33.6h6M42 31.4h4" stroke="'+ORG+'" stroke-width="1" filter="url(#zg)"/>'
  +'<path d="M20 20.4C27 17.6 30 24 23.4 26.6C30 29.4 27 36 20 33" fill="none" stroke="'+OL+'" stroke-width="4"/><path d="M20 20.4C27 17.6 30 24 23.4 26.6C30 29.4 27 36 20 33" fill="none" stroke="url(#z4)" stroke-width="2.4" stroke-linecap="round"/>'
  +'<path d="M4 23.4H20.6V30.2H4Z" fill="url(#z5)" stroke="'+OL+'" stroke-width="1.1"/><path d="M7 23.4l2.4 6.8M11 23.4l2.4 6.8M15 23.4l2.4 6.8" stroke="#8a7c76" stroke-width="1"/><path d="M3.6 22.6C0 23.6 0 30 3.6 31Z" fill="url(#z4)" stroke="'+OL+'" stroke-width="1"/>'
  +'</g>'};
 MYAS.blades=mysv(steel+bronze+leather+glow,
  '<g transform="translate(37 28) rotate(-28) scale(.8) translate(-32 -21)">'+bl(.5)+'</g><g transform="translate(30 37) rotate(-34) scale(.93) translate(-32 -21)">'+bl(1)+'</g>'
  +'<g fill="'+ORG+'" opacity=".9"><circle cx="34" cy="52" r=".9"/><circle cx="40" cy="48" r=".7"/><circle cx="30" cy="56" r=".6"/><circle cx="45" cy="54" r=".6"/></g>')})();
/* Клинок Олимпа */
MYAS.bolimp=mysv(steel+gold+bronze+glow+mygr("z6",[[0,"#6a3c14"],[.5,"#c88a38"],[1,"#5a2e0f"]],[0,0,1,0]),
 '<g transform="rotate(42 32 32) translate(0 1)">'
 +'<path d="M32 0.4C36.4 6 37.6 16 37 38H27C26.4 16 27.6 6 32 0.4Z" fill="'+RUN+'" opacity=".55" filter="url(#zg)"/>'
 +'<path d="M32 1.6C35.6 7 36.4 17 36 38H28C27.6 17 28.4 7 32 1.6Z" fill="url(#z1)" stroke="#bff3ff" stroke-width=".9" stroke-linejoin="round"/>'
 +'<path d="M32 5C34.6 10 35 18 34.6 37H29.4C29 18 29.4 10 32 5Z" fill="url(#z6)"/>'
 +'<path d="M32 6V37" stroke="#1b0f06" stroke-width="1.3"/><path d="M30 12q2-2 4 0M30 17q2-2 4 0M30 22q2-2 4 0M30 27q2-2 4 0M30 32q2-2 4 0" fill="none" stroke="#ffe39a" stroke-width=".7" opacity=".9"/>'
 +'<path d="M20 38C23 33 27 36 28 38H36C37 36 41 33 44 38C41 41 38 40 37 42H27C26 40 23 41 20 38Z" fill="url(#z3)" stroke="'+OL+'" stroke-width="1.1" stroke-linejoin="round"/>'
 +'<g fill="url(#z3)" stroke="'+OL+'" stroke-width=".9" stroke-linejoin="round"><path d="M22 39L17 33L24 36Z"/><path d="M42 39L47 33L40 36Z"/><path d="M26 41L22 47L30 43Z"/><path d="M38 41L42 47L34 43Z"/><path d="M32 42L29.6 49L34.4 49Z"/></g>'
 +'<rect x="29" y="44" width="6" height="12" rx="1.4" fill="url(#z4)" stroke="'+OL+'" stroke-width="1"/><path d="M29 47l6 2M29 51l6 2" stroke="#3a1c08" stroke-width="1"/><path d="M28 56H36L34.4 59.6H29.6Z" fill="url(#z3)" stroke="'+OL+'" stroke-width="1"/><path d="M32 59.6V63" stroke="#e0aa3c" stroke-width="1.6"/>'
 +'</g>');
/* Мьёльнир (God of War) */
MYAS.mjolnir=mysv(steel+gold+leather+glow+mygr("z7",[[0,"#e3e8f1"],[.5,"#a9b3c4"],[1,"#667186"]],[0,0,0,1]),
 '<g transform="rotate(-12 32 32) translate(0 1)">'
 +'<path d="M27.6 36H36.4V56H27.6Z" fill="url(#z5)" stroke="'+OL+'" stroke-width="1.1"/><path d="M27.6 39l8.8 3M27.6 43l8.8 3M27.6 47l8.8 3M27.6 51l8.8 3" stroke="#a08a82" stroke-width="1"/><path d="M26.4 34.4H37.6V39H26.4Z" fill="url(#z3)" stroke="'+OL+'" stroke-width="1"/><path d="M28 36.7h8" stroke="#5d3b0a" stroke-width=".8"/><path d="M26.8 53H37.2V56H26.8Z" fill="url(#z3)" stroke="'+OL+'" stroke-width=".9"/><ellipse cx="32" cy="59.6" rx="3.6" ry="3.2" fill="none" stroke="'+OL+'" stroke-width="3"/><ellipse cx="32" cy="59.6" rx="3.6" ry="3.2" fill="none" stroke="url(#z3)" stroke-width="1.6"/>'
 +'<g transform="translate(32 23) scale(.74 1) translate(-32 -23)"><path d="M6 10H13V15H51V10H58V36H51V31H13V36H6Z" fill="url(#z7)" stroke="'+OL+'" stroke-width="1.4" stroke-linejoin="round"/>'
 +'<path d="M6 10H58V15H6Z" fill="#f2f5fa" opacity=".6"/><path d="M13 15H51M13 31H51" stroke="#4e586b" stroke-width=".9"/>'
 +'<path d="M6.8 11.4H12M52 11.4H57.2M6.8 34.6H12M52 34.6H57.2M13 16.6V29.4M51 16.6V29.4" stroke="url(#z3)" stroke-width="1.5" stroke-linecap="round"/>'
 +'<g fill="none" stroke="'+RUN+'" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" filter="url(#zg)"><path d="M17 19l3 4-3 4M22 18v10M26 19l5 4-5 4M31 18v10M36 19l-3 4 3 4M40 18v10l4-5M47 19v8"/><path d="M9 14v8M9 26v6M55 14v8M55 26v6"/></g></g>'
 +'</g>');
MYART[3]=["Мьёльнир","mjolnir","ᛗᛃᛟᛚᚾᛁᚱ","Молот Тора: серебристая голова с рунами, рукоять в коже и золоте. Всегда возвращается в руку. Выкован братьями Броком и Синдри.","Тор"];
})();

/* ---- подключение к хабу: тема уже зарегистрирована из themes-def.mjs, здесь она становится «adam»-темой с кодом Мифов ---- */
(function(){
 var th=T.filter(function(x){return x.n==="Мифы"})[0];
 if(!th)return;
 var th2=T.filter(function(x){return x.n==="Мифы · Стекло"})[0];
 var o={n:"Мифы",g:"Тёмные",L:"adam",k:"myth",b:"#050505",s:"#101010",t:"#d4d4d4",a:"#f2f2f2",ba:"#050505",fx:"adam8",d:"Тема по мотивам God of War, греческой и скандинавской мифологии: 7 страниц, у каждой своя анимация из символов. «Сегодня»: руки и искра. «Проекты»: гончарный круг, комок глины становится амфорой. «Задачи»: созвездие Стрелец собирается из звёзд. «Итоги недели»: монеты падают в ящик. «Заметки»: свиток. «Подписки»: песочные часы, которые переворачиваются. «Настройки»: шестерёнки. Кнопка «заставка» на странице показывает вход в хаб: звезда загорается, тускнеет, фон темнеет, открывается хаб."};
 for(var k in o)th[k]=o[k];
 th.L="adam";th.x10=0;delete th.ts;
 if(th2){var o2c=Object.assign({},o,{n:"Мифы · Стекло",k:"mythglass"});for(var k2 in o2c)th2[k2]=o2c[k2];th2.L="adam";th2.x10=0;delete th2.ts}
 var HMODE=/(^|[#&])stage/.test(location.hash||"");
 /* страницы хаба (9) -> сцены Мифов (7) */
 var MAP=[0,"b",2,1,"b",5,4,"b",6,3];
 var lay=LY.adam;
 LY.adam=function(t){
  if(!t||!/^myth/.test(t.k))return lay(t);
  var o2=ADPG,h;
  if(HMODE){var mp=MAP[o2];if(mp==="b"){try{return MY_BASE_ADAM(t)}finally{ADPG=o2}}ADPG=mp!=null?mp:0}
  try{h=lay(t)}finally{ADPG=o2}
  h=h.replace('class="lay ad ad-myth"','class="lay ad ad-myth" data-pal="'+(t._pal||"base")+'"');
  if(HMODE){var rm=h.match(/<div class="myth-runes"[^>]*>[^<]*<\/div>/);if(rm){h=h.replace(rm[0],"");var q=h.lastIndexOf("</div>");h=h.slice(0,q)+rm[0]+h.slice(q)}}
  return h};
 var hs=document.createElement("style");
 hs.textContent="#big .myth-st video{background:transparent!important}.ad-myth[data-pal=oly] .myth-st video{filter:invert(1);mix-blend-mode:multiply}"+Object.keys(MYPALS).map(function(k){return ".ad-myth[data-pal="+k+"]{--mybg:"+MYPALS[k].b+"}"}).join("");
 document.head.appendChild(hs);
})();

/* ---- Мифы в хабе: ворон вместо кота, палитры меняют цвета самого хаба, заставка ---- */
function mythPetSvg() {
  var p = MYPALS[MYPAL] || MYPALS.base;
  return myRaven()
    .replace('class="cl-cat ad-cat myth-raven"', 'class="pet"')
    .replace(/var\(--rv1\)/g, p.r1).replace(/var\(--rv2\)/g, p.r2).replace(/var\(--a\)/g, p.a);
}
(function () {
  var H = location.hash || '', EDITOR = /(^|[#&])editor/.test(H), STAGE = /(^|[#&])stage/.test(H);
  if (!EDITOR && !STAGE) return;
  var lastPal = MYPAL;
  function syncOvr() {
    if (typeof OVR === 'undefined') return;
    var p = MYPALS[MYPAL] || MYPALS.base, o = OVR['Мифы'] || (OVR['Мифы'] = {});
    ['b', 's', 't', 'a', 'ba', 'dim'].forEach(function (k) { delete o[k]; });
    if (MYPAL !== 'base') { o.b = p.b; o.s = p.s; o.t = p.t; o.a = p.a; o.ba = p.ba; }
    if (!Object.keys(o).length) delete OVR['Мифы'];
  }
  var rb = renderBig;
  renderBig = function () {
    if (EDITOR && MYPAL !== lastPal) { lastPal = MYPAL; syncOvr(); }
    rb();
    try {
      var th = getT(cur), inf = document.querySelector('#big .info');
      if (EDITOR && th && /^Мифы/.test(th.n) && inf && !inf.querySelector('.myth-pal2')) {
        var h = '<div class="myth-pal2" style="margin:0 0 1em;display:flex;flex-wrap:wrap;gap:.5em;align-items:center"><span class="myth-pal">';
        for (var k in MYPALS) h += '<button type="button" data-mypal="' + k + '"' + (k === MYPAL ? ' class="on"' : '') + '>' + MYPALS[k].n + '</button>';
        h += '</span><button class="myth-sp" type="button" data-mysp="1">▶ заставка</button></div>';
        inf.insertAdjacentHTML('afterbegin', h);
      }
    } catch (e) { /* без палитр в панели */ }
  };
  window.addEventListener('storage', function (e) {
    if (e.key === 'mythPal' && e.newValue && MYPALS[e.newValue] && e.newValue !== MYPAL) { MYPAL = e.newValue; lastPal = MYPAL; renderBig(); }
  });
})();
