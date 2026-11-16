// Preserve example/stale/invalid/ready states across language changes.
const fields=['brief-repo','brief-platform','brief-duration','brief-style'];
export function captureGuideDraft(doc=document){
 return {state:doc.getElementById('prompt-builder').dataset.state,fields:Object.fromEntries(fields.map(id=>[id,doc.getElementById(id).value]))};
}
export function restoreGuideDraft(draft,doc=document){
 for(const id of fields)if(id in draft.fields)doc.getElementById(id).value=draft.fields[id];
 const form=doc.getElementById('prompt-builder');
 if(draft.state==='ready'||draft.state==='invalid')form.requestSubmit();
 else if(draft.state==='dirty')form.dispatchEvent(new Event('input',{bubbles:true}));
}
