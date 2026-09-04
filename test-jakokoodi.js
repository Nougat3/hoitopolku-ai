const puppeteer = require('puppeteer');
const assert = require('assert');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('1. Ladataan sivu ensimmäistä kertaa...');
  await page.goto('file://' + __dirname + '/hoitopolku-demo.html');
  await page.waitForSelector('#codeVal');
  
  // Tarkista että koodi on generoitu
  const initialCode = await page.$eval('#codeVal', el => el.textContent);
  console.log('   Koodi:', initialCode);
  assert(initialCode.match(/^HP-\d{4}$/), 'Koodin tulee olla muotoa HP-XXXX');
  assert(initialCode !== 'HP-0000', 'Koodin ei pitäisi olla placeholder-arvo');
  
  // Tarkista että voimassaoloaika on tulevaisuudessa
  const expText = await page.$eval('#codeExp', el => el.textContent);
  console.log('   Voimassaoloaika:', expText);
  
  // Parsitaan päivämäärä tekstistä (esim. "Vanhenee 11.9.2026 klo 10.45")
  const dateMatch = expText.match(/Vanhenee (\d+)\.(\d+)\.(\d+) klo (\d+)\.(\d+)/);
  assert(dateMatch, 'Voimassaoloajan tulee olla oikeassa muodossa');
  
  const expiryDate = new Date(
    parseInt(dateMatch[3]), // year
    parseInt(dateMatch[2]) - 1, // month (0-indexed)
    parseInt(dateMatch[1]), // day
    parseInt(dateMatch[4]), // hour
    parseInt(dateMatch[5]) // minute
  );
  
  const now = new Date();
  const diffDays = (expiryDate - now) / (1000 * 60 * 60 * 24);
  console.log('   Päiviä jäljellä:', diffDays.toFixed(2));
  assert(diffDays > 6.5 && diffDays < 7.5, 'Voimassaolon tulee olla noin 7 päivää');
  
  console.log('✅ Testi 1 läpäisty: Ensimmäisellä latauksella koodi on tulevaisuudessa\n');
  
  console.log('2. Klikataan "Luo uusi koodi"...');
  // Navigoi ensin koodi-näkymään
  await page.evaluate(() => {
    window.go('koodi');
  });
  await wait(200); // Anna näkymän vaihtua
  
  await page.evaluate(() => {
    window.newCode();
  });
  await wait(100); // Anna DOM:n päivittyä
  
  const newCode = await page.$eval('#codeVal', el => el.textContent);
  console.log('   Uusi koodi:', newCode);
  assert(newCode !== initialCode, 'Koodin tulee muuttua');
  assert(newCode.match(/^HP-\d{4}$/), 'Uuden koodin tulee olla muotoa HP-XXXX');
  
  const newExpText = await page.$eval('#codeExp', el => el.textContent);
  const newDateMatch = newExpText.match(/Vanhenee (\d+)\.(\d+)\.(\d+) klo (\d+)\.(\d+)/);
  const newExpiryDate = new Date(
    parseInt(newDateMatch[3]),
    parseInt(newDateMatch[2]) - 1,
    parseInt(newDateMatch[1]),
    parseInt(newDateMatch[4]),
    parseInt(newDateMatch[5])
  );
  
  const newDiffDays = (newExpiryDate - new Date()) / (1000 * 60 * 60 * 24);
  console.log('   Uusi voimassaoloaika:', newExpText);
  console.log('   Päiviä jäljellä:', newDiffDays.toFixed(2));
  assert(newDiffDays > 6.5 && newDiffDays < 7.5, 'Uuden koodin voimassaolon tulee olla noin 7 päivää');
  
  console.log('✅ Testi 2 läpäisty: "Luo uusi koodi" generoi uuden koodin 7 päivän voimassaololla\n');
  
  console.log('3. Ladataan sivu uudelleen...');
  await page.reload();
  await page.waitForSelector('#codeVal');
  
  const reloadedCode = await page.$eval('#codeVal', el => el.textContent);
  console.log('   Koodi latauksen jälkeen:', reloadedCode);
  assert(reloadedCode === newCode, 'Koodin tulee pysyä samana localStorage:n ansiosta');
  
  const reloadedExpText = await page.$eval('#codeExp', el => el.textContent);
  console.log('   Voimassaoloaika latauksen jälkeen:', reloadedExpText);
  assert(reloadedExpText === newExpText, 'Voimassaoloajan tulee pysyä samana');
  
  console.log('✅ Testi 3 läpäisty: Koodi persistoi localStorage:ssa sivun uudelleenlatauksen yli\n');
  
  console.log('4. Testataan vanhentuneen koodin korvaaminen...');
  // Aseta vanhentunut koodi localStorage:iin
  await page.evaluate(() => {
    localStorage.setItem('hoitopolku_share_code', JSON.stringify({
      code: 'HP-9999',
      expiresAt: Date.now() - 1000 // 1 sekunti sitten
    }));
  });
  
  await page.reload();
  await page.waitForSelector('#codeVal');
  
  const refreshedCode = await page.$eval('#codeVal', el => el.textContent);
  console.log('   Koodi vanhan korvaamisen jälkeen:', refreshedCode);
  assert(refreshedCode !== 'HP-9999', 'Vanhentunut koodi tulee korvata uudella');
  assert(refreshedCode.match(/^HP-\d{4}$/), 'Uuden koodin tulee olla muotoa HP-XXXX');
  
  const refreshedExpText = await page.$eval('#codeExp', el => el.textContent);
  const refreshedMatch = refreshedExpText.match(/Vanhenee (\d+)\.(\d+)\.(\d+) klo (\d+)\.(\d+)/);
  const refreshedExpiryDate = new Date(
    parseInt(refreshedMatch[3]),
    parseInt(refreshedMatch[2]) - 1,
    parseInt(refreshedMatch[1]),
    parseInt(refreshedMatch[4]),
    parseInt(refreshedMatch[5])
  );
  
  const refreshedDiffDays = (refreshedExpiryDate - new Date()) / (1000 * 60 * 60 * 24);
  console.log('   Uusi voimassaoloaika:', refreshedExpText);
  console.log('   Päiviä jäljellä:', refreshedDiffDays.toFixed(2));
  assert(refreshedDiffDays > 6.5 && refreshedDiffDays < 7.5, 'Korvaavan koodin voimassaolon tulee olla noin 7 päivää');
  
  console.log('✅ Testi 4 läpäisty: Vanhentunut koodi korvataan automaattisesti uudella\n');
  
  await browser.close();
  
  console.log('═══════════════════════════════════════');
  console.log('✅ KAIKKI TESTIT LÄPÄISTY');
  console.log('═══════════════════════════════════════');
  process.exit(0);
})().catch(err => {
  console.error('❌ TESTI EPÄONNISTUI:', err.message);
  console.error(err.stack);
  process.exit(1);
});
