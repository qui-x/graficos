(function (g) {
  'use strict';
  const V=g.OrbisViewControls, esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finitePoint=(p,n)=>Array.isArray(p)&&p.length>=n&&p.slice(0,n).every(Number.isFinite);
  const nice=value=>{const magnitude=10**Math.floor(Math.log10(Math.max(value,1e-12))),n=value/magnitude;return (n<=1?1:n<=2?2:n<=5?5:10)*magnitude;};
  const fmt=n=>g.LabKit.fmt(Math.abs(n)<1e-12?0:Number(n.toPrecision(4)));

  function create({host,controls,legend,plot,title,state}) {
    let control=null,frame=null,geometry=null,disposed=false;
    const camera=state||{yaw:-40,pitch:30,center:null,zoom:1,axes:{x:true,y:true,z:true},grid:true,gridPlane:'xy',equal:null,dragMode:'orbit'};
    function dataBounds(data) {
      const dims=data.dimensions===3?3:2,min=[0,0,0],max=[0,0,0];let count=0;
      for(const series of data.series)for(const p of series.points)if(finitePoint(p,dims)){count++;for(let i=0;i<dims;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}}
      return {min,max,count};
    }
    function fit(reset=false) {
      const b=dataBounds(plot());camera.center={x:(b.min[0]+b.max[0])/2,y:(b.min[1]+b.max[1])/2,z:(b.min[2]+b.max[2])/2};camera.zoom=1;
      if(reset){camera.yaw=-40;camera.pitch=30;camera.dragMode='orbit';camera.gridPlane='xy';}
      redraw();
    }
    function redraw() {if(disposed)return;if(frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;draw();});}
    const adapter={
      get:()=>({...camera,dimension:plot().dimensions===3?3:2,projection:'orthographic',center:camera.center||{x:0,y:0,z:0}}),
      set:p=>{Object.assign(camera,p);if(camera.center)for(const axis of ['x','y','z'])camera.center[axis]=V.clamp(camera.center[axis],-1e9,1e9);redraw();},
      zoom:factor=>{camera.zoom=V.clamp(camera.zoom*factor,.1,20);redraw();},
      pan:(dx,dy)=>{
        if(!geometry)return;const {sx,sy}=geometry;
        if(plot().dimensions===3){const yaw=camera.yaw*Math.PI/180,pitch=camera.pitch*Math.PI/180,cy=Math.cos(yaw),sn=Math.sin(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);camera.center.x+=-dx/sx*cy-dy/sy*sn*sp;camera.center.y+=-dx/sx*sn+dy/sy*cy*sp;camera.center.z+=dy/sy*cp;}
        else {camera.center.x-=dx/sx;camera.center.y+=dy/sy;}
        for(const axis of ['x','y','z'])camera.center[axis]=V.clamp(camera.center[axis],-1e9,1e9);redraw();
      },fit:()=>fit(),reset:()=>fit(true),flush:()=>{if(frame!==null){cancelAnimationFrame(frame);frame=null;}draw();}
    };
    function draw() {
      if(disposed||!host.isConnected)return;
      const data=plot(),is3=data.dimensions===3,b=dataBounds(data);
      if(!b.count){host.innerHTML='<p>Nenhum ponto real finito no intervalo.</p>';return;}
      if(!camera.center)camera.center={x:(b.min[0]+b.max[0])/2,y:(b.min[1]+b.max[1])/2,z:(b.min[2]+b.max[2])/2};
      if(camera.equal===null)camera.equal=!!data.equal;
      const W=Math.max(200,Math.floor(host.clientWidth||600)),H=Math.max(250,Math.min(430,W*.67)),left=W<350?45:60,top=28,pw=W-left-24,ph=H-top-45;
      const ranges=b.max.map((v,i)=>Math.max(v-b.min[i],1e-9)),rangeX=ranges[0]<1e-8?2:ranges[0],rangeY=ranges[1]<1e-8?2:ranges[1];
      let sx=pw/(rangeX*1.2),sy=ph/(rangeY*1.24);
      if(is3){const diameter=Math.max(Math.hypot(...ranges),1);sx=sy=Math.min(pw,ph)/(diameter*1.18);}
      else if(camera.equal)sx=sy=Math.min(sx,sy);
      sx*=camera.zoom;sy*=camera.zoom;geometry={sx,sy};
      const yaw=camera.yaw*Math.PI/180,pitch=camera.pitch*Math.PI/180,cy=Math.cos(yaw),sn=Math.sin(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),target=camera.center;
      const project=p=>{
        if(!finitePoint(p,is3?3:2))return null;
        const x=p[0]-target.x,y=p[1]-target.y,z=(p[2]||0)-target.z;
        return [left+pw/2+(is3?cy*x+sn*y:x)*sx,top+ph/2-(is3?-sn*sp*x+cy*sp*y+cp*z:y)*sy];
      };
      const styles=getComputedStyle(document.documentElement),color=v=>styles.getPropertyValue(v).trim(),ink=color('--text')||'#17293e',muted=color('--muted')||'#64748b',bg=color('--surface')||'#fff',line=color('--line')||'#cbd5e1',axisColors=[color('--cyan'),color('--violet'),color('--pink')],colors=[color('--cyan'),color('--pink'),color('--violet'),color('--green'),'#b98b3a'];
      const groupNames=[...new Set(data.series.map(s=>s.name))];
      let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${is3?'Projeção ortogonal em três dimensões':'Gráfico em duas dimensões'}. Centro ${esc(fmt(target.x))}, ${esc(fmt(target.y))}${is3?', '+esc(fmt(target.z)):''}. Zoom ${Math.round(camera.zoom*100)}%.</desc><rect width="${W}" height="${H}" fill="${esc(bg)}"/><defs><clipPath id="wbClip"><rect x="${left}" y="${top}" width="${pw}" height="${ph}"/></clipPath></defs>`;
      const segment=(a,b,stroke,width=1,dash='',extra='')=>{const p=project(a),q=project(b);if(!p||!q)return '';return `<path ${extra} d="M${p[0].toFixed(3)} ${p[1].toFixed(3)}L${q[0].toFixed(3)} ${q[1].toFixed(3)}" fill="none" stroke="${esc(stroke)}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''}/>`;};
      const inside=p=>p[0]>=left+5&&p[0]<=left+pw-12&&p[1]>=top+12&&p[1]<=top+ph-5;
      const text=(x,y,value,fill=muted,extra='')=>`<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="11" fill="${esc(fill)}" ${extra}>${esc(value)}</text>`;
      if(!is3){
        const xmin=target.x-pw/2/sx,xmax=target.x+pw/2/sx,ymin=target.y-ph/2/sy,ymax=target.y+ph/2/sy;
        const tx=nice((xmax-xmin)/(W<420?3:5)),ty=nice((ymax-ymin)/4);
        for(let i=Math.ceil(xmin/tx),count=0;i*tx<=xmax&&count<12;i++,count++){const x=i*tx,p=project([x,0]);if(camera.grid)svg+=`<path d="M${p[0]} ${top}V${top+ph}" stroke="${esc(line)}"/>`;svg+=text(p[0],H-20,fmt(x),muted,'text-anchor="middle"');}
        for(let i=Math.ceil(ymin/ty),count=0;i*ty<=ymax&&count<12;i++,count++){const y=i*ty,p=project([0,y]);if(camera.grid)svg+=`<path d="M${left} ${p[1]}H${left+pw}" stroke="${esc(line)}"/>`;svg+=text(left-6,p[1]+4,fmt(y),muted,'text-anchor="end"');}
        svg+='<g clip-path="url(#wbClip)">';
        if(camera.axes.x)svg+=segment([xmin,0],[xmax,0],axisColors[0],1.4,'','data-coordinate-axis="x"');
        if(camera.axes.y)svg+=segment([0,ymin],[0,ymax],axisColors[1],1.4,'','data-coordinate-axis="y"');
        svg+='</g>';
        svg+=text(left+pw/2,H-3,data.axes?.[0]||'x',muted,'text-anchor="middle"')+text(left,14,data.axes?.[1]||'y');
      }else{
        const extent=Math.max(...b.min.map(Math.abs),...b.max.map(Math.abs),1),step=nice(extent/4),end=step*5;
        svg+='<g clip-path="url(#wbClip)">';
        const plane=(u,v)=>camera.gridPlane==='xz'?[u,0,v]:camera.gridPlane==='yz'?[0,u,v]:[u,v,0];
        if(camera.grid)for(let i=-5;i<=5;i++){svg+=segment(plane(-end,i*step),plane(end,i*step),line)+segment(plane(i*step,-end),plane(i*step,end),line);}
        for(let i=0;i<3;i++)if(camera.axes[['x','y','z'][i]]){
          const a=[0,0,0],b=[0,0,0];a[i]=-end;b[i]=end;svg+=segment(a,b,axisColors[i],1.5,'',`data-coordinate-axis="${['x','y','z'][i]}"`);
          // A coordinate looking straight at the camera collapses to a point.
          // Suppress its tick labels to keep the selected plane readable.
          const p=project(a),q=project(b);if(Math.hypot(q[0]-p[0],q[1]-p[1])>25){for(let n=-4;n<=4;n++){if(!n)continue;const u=[0,0,0];u[i]=n*step;const t=project(u);if(inside(t))svg+=`<circle cx="${t[0]}" cy="${t[1]}" r="2" fill="${esc(axisColors[i])}"/>`+text(t[0]+4,t[1]-5,fmt(n*step),axisColors[i]);}}
        }
        svg+='</g>';
      }
      svg+='<g clip-path="url(#wbClip)">';
      for(const s of data.series){
        const idx=groupNames.indexOf(s.name),ci=s.reference?muted:colors[idx%colors.length],dash=s.reference?'7 5':idx%3===1?'8 3':idx%3===2?'2 3':'',points=s.points.map(project);
        if(s.kind==='points')for(const p of points.filter(Boolean).slice(0,3000))svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.reference?esc(bg):esc(ci)}" stroke="${esc(ci)}"/>`;
        else {let d='',previous=null;for(const p of points){if(!p){previous=null;continue;}const split=previous&&!is3&&!data.equal&&Math.abs(p[1]-previous[1])>ph*.55;d+=`${!previous||split?'M':'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)} `;previous=p;}svg+=`<path data-plot-series="${esc(s.name)}" d="${d}${s.fill?'Z':''}" stroke="${esc(ci)}" fill="${s.fill?esc(ci):'none'}" fill-opacity="${s.fill?'.12':'1'}" stroke-width="${s.reference?'1.5':'2'}" stroke-dasharray="${dash}"/>`;}
        if(s.arrow&&points.length>=2){const a=points[0],b=points.at(-1);if(a&&b){const t=Math.atan2(b[1]-a[1],b[0]-a[0]);svg+=`<path d="M${b[0]-8*Math.cos(t-.45)} ${b[1]-8*Math.sin(t-.45)}L${b[0]} ${b[1]}L${b[0]-8*Math.cos(t+.45)} ${b[1]-8*Math.sin(t+.45)}" fill="none" stroke="${esc(ci)}" stroke-width="2"/>`;}}
      }
      svg+='</g>';
      if(is3){
        const origin=[W-51,53],directions=[[cy,-sn*sp],[sn,cy*sp],[0,cp]];
        svg+=`<g aria-label="Orientação dos eixos"><rect x="${W-91}" y="9" width="82" height="83" rx="4" fill="${esc(bg)}" stroke="${esc(line)}"/>`;
        directions.forEach((d,i)=>{const q=[origin[0]+d[0]*25,origin[1]-d[1]*25],axis=['x','y','z'][i];svg+=`<path d="M${origin[0]} ${origin[1]}L${q[0]} ${q[1]}" stroke="${esc(axisColors[i])}" stroke-width="2"/>`+text(q[0]+(i===2?5:0),q[1]+(i===2?-3:12),axis.toUpperCase(),axisColors[i],'text-anchor="middle"');});svg+='</g>';
      }
      svg+='</svg>';host.innerHTML=svg;
      const seen=new Set();legend.innerHTML=data.series.map(s=>{if(seen.has(s.name))return '';seen.add(s.name);return `<span><i style="background:${esc(s.reference?muted:colors[groupNames.indexOf(s.name)%colors.length])}"></i>${esc(s.name)}</span>`;}).join('');
      control?.update();
    }
    draw();
    control=V.mount(controls,adapter,{open:plot().dimensions===3});
    const stopGestures=V.gestures(host,adapter);
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(redraw):null;observer?.observe(host);
    return {state:camera,redraw,draw,adapter,destroy:()=>{disposed=true;if(frame!==null)cancelAnimationFrame(frame);observer?.disconnect();stopGestures();control.destroy();}};
  }
  g.OrbisPlotView={create};
})(window);
