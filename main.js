const input = document.getElementById('input');
const starsEl = document.getElementById('stars');
const levelEl = document.getElementById('level');
const transformBtn = document.getElementById('transform');
const clearBtn = document.getElementById('clear');
const resultWrap = document.getElementById('resultWrap');
const resultEl = document.getElementById('result');
const copyBtn = document.getElementById('copy');
const editBtn = document.getElementById('edit');

let rating = 5;
let conversationHistory = [];

// Intro handling: show overlay then hide to reveal app
const introEl = document.getElementById('intro');
if (introEl) {
  // Keep interactions blocked while intro is visible; auto-hide after a short delay
  setTimeout(() => {
    introEl.classList.add('hidden');
    // remove from DOM after transition to free pointer events
    setTimeout(() => introEl.remove(), 700);
  }, 1800); // visible for ~1.8s, then fade
}

// build star elements (1-10)
for(let i=1;i<=10;i++){
  const s = document.createElement('div');
  s.className='star';
  s.textContent = '★';
  s.dataset.value = i;
  s.addEventListener('click', ()=> setRating(i));
  starsEl.appendChild(s);
}
function setRating(v){
  rating = v;
  levelEl.textContent = v;
  starsEl.querySelectorAll('.star').forEach(el=>{
    el.classList.toggle('on', Number(el.dataset.value) <= v);
  });
  starsEl.setAttribute('aria-valuenow', v);
}
setRating(5);

// keyboard support
starsEl.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft' && rating>1) setRating(rating-1);
  if(e.key==='ArrowRight' && rating<10) setRating(rating+1);
});

clearBtn.addEventListener('click', ()=>{
  input.value='';
  resultWrap.classList.add('hidden');
  resultEl.textContent='';
});

copyBtn.addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(resultEl.textContent || ''); }catch(e){}
});

editBtn.addEventListener('click', ()=>{
  input.value = resultEl.textContent || '';
  resultWrap.classList.add('hidden');
});

transformBtn.addEventListener('click', async ()=>{
  const text = input.value.trim();
  if(!text) return;
  transformBtn.disabled = true;
  transformBtn.textContent = 'Working...';
  resultEl.textContent = '';
  resultWrap.classList.remove('hidden');

  // prepare system prompt with adjustable style based on rating
  const styleHint = buildStyleHint(rating);
  const system = `You are a concise creative writing assistant. Rewrite the user's sentence according to the style instructions below. Preserve meaning and tone where possible. Keep output as a single polished sentence or two maximum. ${styleHint}`;

  conversationHistory.push({ role: 'user', content: text });
  conversationHistory = conversationHistory.slice(-10);

  try{
    // Use global websim API (available in this environment)
    const completion = await websim.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        // provide last user message as conversation context
        ...conversationHistory.slice(-1)
      ],
      max_output_tokens: 300
    });
    const out = completion.content?.trim?.() ?? '';
    resultEl.textContent = out;
    // append assistant response into history
    conversationHistory.push({ role: 'assistant', content: out });
  }catch(err){
    console.error(err);
    resultEl.textContent = 'computer could not fancyifer this. mj will remember this';
  }finally{
    transformBtn.disabled = false;
    transformBtn.textContent = 'Transform';
  }
});

function buildStyleHint(r){
  // below 5: simpler; 5: balanced; 6-10: increasingly ornate
  if(r <= 4){
    return `Make the sentence simpler and more direct. Use plain vocabulary, short words, and short clauses. Keep it natural and conversational. Reduce any florid or rare words.`;
  }
  if(r === 5){
    return `Produce a balanced polished version: clear, slightly elevated vocabulary, fluid rhythm, but not ornate. Keep length similar.`;
  }
  // r > 5: ornate progressively
  const intensity = ['gently ornate','moderately ornate','quite ornate','very ornate','extravagantly ornate'];
  const idx = Math.min(intensity.length-1, Math.floor((r-6)/ ( (10-6)/ (intensity.length-1) + 0.0001 )));
  const adjective = intensity[idx] || 'ornate';
  const extras = Math.max(0, Math.round((r-6)/ (10-6+0.0001) * 4));
  const guidance = `Use ${adjective} language: richer vocabulary, elegant phrasing, varied punctuation, tasteful metaphors or literary flourishes.`;
  const lengthNote = extras >= 2 ? 'You may slightly expand the sentence for elegance.' : 'Keep it compact but elegant.';
  return guidance + ' ' + lengthNote;
}

// start with a short placeholder
resultEl.textContent = '';
