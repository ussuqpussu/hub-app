/* ---------- МИФЫ: ASCII-сцены (по мотивам God of War, греческой и скандинавской мифологии) ---------- */
TSN.myth = ["Гончарный круг", "Созвездие Стрелец", "Песочные часы", "Свиток"];
(function () {
var MYD = { coins: 14, stars: 5, proj: 62, days: 3, notes: 5, demo: true };
var MYSTARS={"Каус Австралис":[393.1,340.6,1.79],"Нунки":[171.4,92.6,2.05],"Каус Медиа":[419.4,200.9,2.7],"Каус Бореалис":[371.9,65.7,2.82],"Аскелла":[124.2,202.5,2.6],"Альнасл":[525.9,219.1,2.99],"φ":[242.3,113.9,3.17],"τ":[88.7,134.7,3.32]};
var MYORD=["Каус Австралис","Нунки","Каус Медиа","Каус Бореалис","Аскелла","Альнасл","φ","τ"];
var MYLN=[["Каус Медиа","Каус Австралис"],["Каус Австралис","Аскелла"],["Аскелла","τ"],["τ","Нунки"],["Нунки","φ"],["φ","Каус Медиа"],["Каус Бореалис","Каус Медиа"],["Каус Бореалис","φ"],["Альнасл","Каус Медиа"],["Альнасл","Каус Австралис"]];
function mySm(x){x=Math.min(1,Math.max(0,x));return x*x*(3-2*x)}
var MYS = {};
function myRnd(i,k){var x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)}
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
/* рисуем сцену на скрытом холсте 640×400 и превращаем в символы " .:-=+*#%@" */
var RAMP = " .:-=+*#%@", COLS = 150, ROWS = 56, ST = {};
function mythDraw(E, key) {
  var s = ST[key] || (ST[key] = { S: {}, oc: document.createElement("canvas"), t0: E.t, lt: E.t });
  if (!s.c) { s.oc.width = 640; s.oc.height = 400; s.c = s.oc.getContext("2d", { willReadFrequently: true }); }
  var dt = Math.min(.1, Math.max(0, E.t - s.lt)); s.lt = E.t;
  var c = s.c; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.fillStyle = "#000"; c.fillRect(0, 0, 640, 400); c.lineCap = "butt";
  MYS[key](c, s.S, E.t - s.t0, dt, MYD);
  var px = c.getImageData(0, 0, 640, 400).data, g = E.ctx, w = E.w, h = E.h;
  var th = E.th || {}, col = (th.pal && th.pal[3]) || "#d4d4d4";
  g.fillStyle = "#050505"; g.fillRect(0, 0, w, h);
  var ch = Math.min(h / ROWS, w / COLS / .6), cw = ch * .6, ox = (w - cw * COLS) / 2, oy = (h - ch * ROWS) / 2, sx = 640 / COLS, sy = 400 / ROWS;
  g.font = "bold " + (ch * .98) + "px ui-monospace,Consolas,'Courier New',monospace"; g.textBaseline = "middle"; g.textAlign = "center"; g.fillStyle = col;
  var cx, cy, x, y;
  for (cy = 0; cy < ROWS; cy++) for (cx = 0; cx < COLS; cx++) {
    var sum = 0, n = 0, x0 = Math.floor(cx * sx), y0 = Math.floor(cy * sy);
    for (y = y0; y < y0 + sy; y += 2) for (x = x0; x < x0 + sx; x += 2) { sum += px[(y * 640 + x) * 4]; n++; }
    var tn = sum / n / 255; tn = Math.min(1, Math.max(0, (tn - .03) * 1.9)); if (tn < .04) continue;
    var idx = Math.min(RAMP.length - 1, Math.floor(Math.pow(tn, .75) * RAMP.length)); if (idx < 1) continue;
    g.globalAlpha = .6 + .4 * tn; g.fillText(RAMP[idx], ox + cx * cw + cw / 2, oy + cy * ch + ch / 2);
  }
  g.globalAlpha = 1;
}
TSC.myth = ["vase", "stars", "hourglass", "scroll"].map(function (k) { return function (E) { mythDraw(E, k); }; });
})();
