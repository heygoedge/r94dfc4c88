/* Shared 2D geometry; source X/Y use the same scale without perspective. */
(function (global) {
  'use strict';
  global.HG_SLOPE_GEOMETRY = function (points, width, height, padding={}) {
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    const scale=Math.min((width-(padding.x??96))/Math.max(xmax-xmin,1),(height-(padding.y??90))/Math.max(ymax-ymin,1));
    const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
    const xy=p=>[width/2+(p.x-cx)*scale,(height-20)/2+(p.y-cy)*scale];
    const inverse=q=>({x:(q[0]-width/2)/scale+cx,y:(q[1]-(height-20)/2)/scale+cy});
    return {width,height,scale,xy,inverse,xmin,xmax,ymin,ymax};
  };
})(window);
