const fs = require('fs');
const path = 'C:/Users/Usuario/Desktop/NOMINA/src/components/Nomina/TabLiquidacion.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the malformed if (!selectedWorkerData) block
content = content.replace(
`  if (!selectedWorkerData) {
    const getTotal = (field) => {
    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";
    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {
      const prefix = \`\${selectedWorkerData.cedula}_\${row.dia}\`;
      const val = overrides[\`\${prefix}_\${field}\`] !== undefined ? overrides[\`\${prefix}_\${field}\`] : row[field];
      return acc + (Number(val) || 0);
    }, 0);
    return sum === 0 ? "0.0" : sum.toFixed(1);
  };

  return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200 shadow-sm animate-stitch">
         Selecciona un operario desde el Panel General para liquidar.
      </div>
    );
  }`,
`  if (!selectedWorkerData) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200 shadow-sm animate-stitch">
         Selecciona un operario desde el Panel General para liquidar.
      </div>
    );
  }`
);

const numericInputComponent = `
  const NumericInput = ({ valKey, fallback, className }) => {
    let val = "";
    if (overrides[valKey] !== undefined) {
      val = overrides[valKey];
    } else {
      const num = Number(fallback) || 0;
      val = num === 0 ? "" : Number(num).toFixed(1);
    }
    return (
      <input
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => {
          let rawValue = e.target.value.replace(',', '.');
          if (rawValue === "") {
            handleCellEdit(valKey, "");
            return;
          }
          if (!isNaN(rawValue) || rawValue === '.' || rawValue === '-') {
            handleCellEdit(valKey, rawValue);
          }
        }}
        className={className}
      />
    );
  };`;

content = content.replace('const getTotal = (field) => {', numericInputComponent + '\n\n  const getTotal = (field) => {');

// Replace the hour inputs
content = content.replace(
  /<input type="number" step="0\.1" value=\{overrides\[`([^`]+)`\] !== undefined \? overrides\[`([^`]+)`\] : Number\(([^)]+)\)\.toFixed\(1\)\} onChange=\{\(e\) => handleCellEdit\(`([^`]+)`, e\.target\.value\)\} className="([^"]+)" \/>/g,
  '<NumericInput valKey={`$1`} fallback={$3} className="$5" />'
);

// Replace the money inputs
content = content.replace(
  /<input type="number" value=\{([^}]+)\} onChange=\{\(e\) => handleCellEdit\(`([^`]+)`, e\.target\.value\)\} className="([^"]+)" \/>/g,
  '<input type="text" inputMode="decimal" value={$1 === 0 ? "" : $1} onChange={(e) => { let v = e.target.value.replace(\',\', \'.\'); if(v==="") { handleCellEdit(`$2`, ""); return; } if(!isNaN(v) || v===\'.\' || v===\'-\') handleCellEdit(`$2`, v); }} className="$3" />'
);

// Also modify getTotal to ensure that it sums correctly with Number(val) || 0, which it already does in TabLiquidacion!
// Let's also check other math functions like the recálculos at the bottom.

fs.writeFileSync(path, content, 'utf8');
console.log('Replacements done!');
