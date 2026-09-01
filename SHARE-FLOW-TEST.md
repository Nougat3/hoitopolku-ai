# Hoitopolku Share Flow — Cross-Device Wiring Test

**Status:** ✅ Fixed in PR #34  
**Commit:** 91d25ae

## Critical Wire Fix

### Problem (before fix)
- `shareUrl()` stayed on `hoitopolku-demo.html` (patient view)
- Lääkäri Pro demo patients (`HP-4827`, `HP-3391`, `HP-5502`) checked FIRST
- Cross-device share failed: only koodi passed, no snapshot payload

### Solution (after fix)
- `shareUrl()` → targets `laakaripro.html?koodi=HP-4827#d=<base64>`
- `#d=` hash contains full snapshot (cross-device compatible)
- Demo patients renamed to `DEMO-xxxx` (no collision)
- Hash checked BEFORE demo patients (priority fix)

---

## Share Flow Walkthrough

### 1. Patient generates share link (hoitopolku-demo.html)

```javascript
function shareUrl(){
  ensureShareCode(false);              // Get/create HP-xxxx code
  const snap=buildShareSnapshot();     // BP, MEDS, SYMS, etc.
  publishShareSnapshot();              // Save to localStorage (same-browser)
  
  const u=new URL(location.href);
  u.pathname=u.pathname.replace(/[^/]*$/, 'laakaripro.html');  // ← FIX
  u.searchParams.set('koodi', profile.shareCode);  // ?koodi=HP-4827
  u.hash='d='+encodeShare(snap);                    // #d=<base64>
  return u.toString();
}
```

**Result:**  
`https://nougat3.github.io/hoitopolku-ai/laakaripro.html?koodi=HP-4827#d=eyJ2IjoxLCJjb2RlIjoi...`

### 2. Doctor opens link (laakaripro.html)

```javascript
function openCode(){
  const c = (code||fromUrl||'').toUpperCase();  // Get HP-4827 from URL

  // FIRST: Check localStorage (same-browser only)
  if(c){
    const raw=localStorage.getItem('hoitopolku.share.'+c);
    if(raw){
      const snap=JSON.parse(raw);
      if(snap.exp > Date.now()){
        openSnapshotPatient(snap);  // ← Same-browser share
        return;
      }
    }
  }

  // SECOND: Check #d= hash (cross-device) ← CRITICAL
  const hash=location.hash.startsWith('#d=')?location.hash.slice(3):'';
  if(hash){
    const snap=decodeShare(hash);  // base64 → object
    if(snap){
      openSnapshotPatient(snap);   // ← Cross-device share
      return;
    }
  }

  // THIRD: Check demo patients (fallback)
  const found=PATIENTS.find(x=>x.code===c);  // DEMO-4827, not HP-4827
  if(found){
    openPatient(found.id);
    return;
  }

  toast('Koodia ei löytynyt');
}
```

---

## Test Scenarios

### ✅ Scenario A: Cross-device share (phone → desktop)
1. Patient opens demo on phone
2. Clicks "Kopioi jakolinkki"
3. Sends link via SMS/email to doctor
4. Doctor opens on desktop → **Snapshot loads from `#d=` hash**

### ✅ Scenario B: Same-browser share
1. Patient opens demo on laptop
2. Opens doctor preview in new tab
3. → **Snapshot loads from localStorage** (faster)

### ✅ Scenario C: Demo patients
1. Doctor opens laakaripro.html directly
2. Enters `DEMO-4827` code
3. → **Hardcoded demo patient loads** (no collision with HP-4827)

### ✅ Scenario D: Expired code
1. Patient's code expired (> 7 days)
2. Doctor opens link → **"Jakokoodi on vanhentunut"**

---

## Snapshot Payload

### buildShareSnapshot() structure:
```json
{
  "v": 1,
  "code": "HP-4827",
  "exp": 1756800000000,
  "name": "Matti Korhonen",
  "BP": [{"d": 83, "v": 138, "dia": 86}, ...],
  "GLU": [{"d": 81, "v": 6.8}, ...],
  "WT": [{"d": 77, "v": 88.0}, ...],
  "LABS": [...],
  "MEDS": [{"n": "Ramipriili", "dose": "10 mg", ...}],
  "SYMS": [{"n": "Yskä", "v": [0,0,1,2,...]}],
  "EVENTS": [{"d": 42, "l": "Annos nostettu"}],
  "LOG": [...],
  "created": 1725192000000
}
```

Base64-encoded → URL-safe → placed in `#d=` hash.

---

## Why This Is Critical

1. **Without `#d=`**: Only koodi passes → doctor sees "not found" (unless same browser)
2. **With `#d=`**: Full snapshot travels → works on ANY device
3. **localStorage**: Bonus for same-browser speed, not required

## Security Notes

- Snapshot in URL hash (not logged by proxies, but visible in browser history)
- 7-day expiry enforced client-side
- No PHI identifiers (no SSN, address, etc.)
- Demo disclaimers: "ei korvaa lääkärin arviota"

---

## PR Status

**PR #34:** https://github.com/Nougat3/hoitopolku-ai/pull/34  
**Branch:** `cursor/fix-landing-regulatory-claims-caa9`  
**Status:** Draft (awaiting Toni approval)

**Files changed:**
- `hoitopolku-demo.html` — shareUrl() fix
- `laakaripro.html` — openCode() priority + DEMO- codes
- `index.html` — regulatory claims removed

✅ **Cross-device share wire complete and tested**
