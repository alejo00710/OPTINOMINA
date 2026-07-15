const fs = require('fs');
const path = 'src/components/Nomina/TabLiquidacion.jsx';
let content = fs.readFileSync(path, 'utf8');

const onChangeRegex = /onChange=\{\(e\) => handleCellEdit\(`([^`]+)`, e\.target\.value\.replace\(',', '\.'\)\)\}/g;

const newOnChange = `onChange={(e) => {
       let val = e.target.value.replace(',', '.');
       if (val === '') {
         handleCellEdit(\`$1\`, '');
         return;
       }
       if (/^-?\\d*\\.?\\d*$/.test(val)) {
         handleCellEdit(\`$1\`, val);
       }
     }}`;

content = content.replace(onChangeRegex, newOnChange);

// Also we need to fix the fallback value logic.
// The user said: value={overrides[key] !== undefined ? overrides[key] : (valorFallback || '0.0')}
// Currently, the hour inputs are: value={overrides[\`$1\`] !== undefined ? overrides[\`$1\`] : Number($3).toFixed(1)}
// Wait, the user said: "Asegúrate de que si overrides[key] es un string vacío `""`, se respete y se renderice el input vacío, NO el fallback."
// In JS, `"" !== undefined` is true, so the current `overrides[\`$1\`] !== undefined ? overrides[\`$1\`] : Number($3).toFixed(1)` IS CORRECT!
// Let me verify if `vExtNoc` uses `!== undefined`.
// In `TabLiquidacion.jsx`:
// const vExtNoc = overrides[\`\${selectedWorkerData.cedula}_vr_ext_noc\`] !== undefined ? overrides[\`\${selectedWorkerData.cedula}_vr_ext_noc\`] : Math.round((salario_base / 240) * 1.75 * totalExtraNoc);
// This also uses `!== undefined`, so it's correct!

// Let's execute the replacement!
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed onChanges!');
