function stats(rows){const d={V:0,A:0,R:0,K:0};rows.forEach(r=>{const max=Math.max(r.V,r.A,r.R,r.K);if(r.V===max)d.V++;if(r.A===max)d.A++;if(r.R===max)d.R++;if(r.K===max)d.K++});return d}
