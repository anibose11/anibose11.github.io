(function(){
  var sel=document.getElementById('assoc-select');
  if(!sel){return;}
  var blocks=document.querySelectorAll('[data-assoc-block]');
  sel.hidden=false; document.getElementById('assoc-label').hidden=false;
  function show(v){blocks.forEach(function(b){b.hidden=(v!=='all' && b.getAttribute('data-assoc-block')!==v);});
    var s=document.getElementById('assoc-status'); if(s){s.textContent=v==='all'?'Showing all five associations.':'Showing one association.';}}
  sel.addEventListener('change',function(){show(sel.value);});
  show(sel.value);
})();
