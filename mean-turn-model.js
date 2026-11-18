/* Per-turn mean values must come from the main pipeline, never from peak or interpolated roll data. */
(function (global) {
  'use strict';
  const quantile = (sorted, p) => {
    if (!sorted.length) return null;
    const index = (sorted.length - 1) * p, lo = Math.floor(index), fraction = index - lo;
    return sorted[lo] + ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]) * fraction;
  };
  const mix = (a, b, t) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  global.HG_MEAN_TURNS = function (record, metric, method = 'mean') {
    if (!['edgeChange', 'edge', 'meanSpeed', 'meanEdge', 'gForce'].includes(metric)) throw new Error('Unknown mean metric');
    if (!['median', 'mean'].includes(method)) throw new Error('Unknown baseline method');
    const field = {edgeChange:'transitionSeconds',edge:'maxEdgeDeg',meanSpeed:'meanSpeedKmh',meanEdge:'meanEdgeDeg',gForce:'gForce'}[metric];
    const measure=turn=>{
      const located=metric!=='edgeChange'||Number.isInteger(turn.edgeChangeIndex)&&turn.edgeChangeIndex>=0&&turn.edgeChangeIndex<turn.points.length;
      return located&&turn.valid===true&&Number.isFinite(turn[field])&&turn[field]>=0?turn[field]:null;
    };
    const turns=record.turns.map((turn,index)=>{const value=measure(turn);return {...turn,index,value,status:turn.valid===false?'invalid':value===null?'missing':'valid'};});
    // Draw a single segment while retaining the user's per-run color reference.
    const siblings=record.runId?(global.HG_MEAN_RECORDS||[]).filter(r=>r.runId===record.runId&&r.personId===record.personId):[];
    const reference=siblings.length?siblings.flatMap(r=>r.turns):record.turns;
    const values=reference.map(measure).filter(v=>v!==null).sort((a,b)=>a-b);
    const baseline = values.length ? method === 'median' ? quantile(values, .5) : values.reduce((a,b)=>a+b,0)/values.length : null;
    const low = quantile(values,.1), high = quantile(values,.9);
    // One symmetric scale around this run's arithmetic mean. Never stretch
    // P10/P90 to the palette endpoints or clip observed outliers.
    const maxDeviation = baseline === null ? 0 : Math.max(...values.map(v=>Math.abs(v-baseline)));
    const colorSpan = baseline === null ? null : Math.max(maxDeviation, Math.abs(baseline)*.5, 1e-9);
    const color = value => {
      if (!Number.isFinite(value) || baseline === null) return '#c6cdd3';
      const deviation = Math.max(-1,Math.min(1,(value-baseline)/colorSpan));
      // Symmetric RGB steps: the exact midpoint is #5b93c5.
      return mix([153,210,247],[29,84,147],(deviation+1)/2);
    };
    // Invalid or missing turns break a line. The opposite edge does not.
    const runs = edge => {
      const result = []; let run = [];
      let segment = null;
      for (const turn of turns) {
        if (segment !== null && segment !== turn.segmentId) {if(run.length) result.push(run);run=[];}
        segment = turn.segmentId;
        if (turn.value === null || !['toe','heel'].includes(turn.edge)) {
          if (run.length) result.push(run); run = [];
        } else if (turn.edge === edge) run.push(turn);
      }
      if (run.length) result.push(run);
      return result;
    };
    return {turns,baseline,low,high,colorSpan,color,runs,count:turns.filter(t=>t.value!==null).length,method,unit:metric==='edgeChange'?'s':metric==='meanSpeed'?'km/h':metric==='gForce'?'g':'°'};
  };
})(window);
