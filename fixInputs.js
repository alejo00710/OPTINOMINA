const fs = require('fs');
const path = 'src/components/Nomina/TabLiquidacion.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace hours inputs
content = content.replace(
  /<input type="number" step="0\.1" value=\{overrides\[`([^`]+)`\] !== undefined \? overrides\[`([^`]+)`\] : Number\(([^)]+)\)\.toFixed\(1\)\} onChange=\{\(e\) => handleCellEdit\(`([^`]+)`, e\.target\.value\)\} className="([^"]+)" \/>/g,
  '<input type="text" inputMode="decimal" value={overrides[`$1`] !== undefined ? overrides[`$1`] : Number($3).toFixed(1)} onChange={(e) => handleCellEdit(`$1`, e.target.value.replace(\',\', \'.\'))} onFocus={(e) => e.target.select()} className="$5" />'
);

// Replace money inputs
content = content.replace(
  /<input type="number" value=\{([^}]+)\} onChange=\{\(e\) => handleCellEdit\(`([^`]+)`, e\.target\.value\)\} className="([^"]+)" \/>/g,
  '<input type="text" inputMode="decimal" value={$1} onChange={(e) => handleCellEdit(`$2`, e.target.value.replace(\',\', \'.\'))} onFocus={(e) => e.target.select()} className="$3" />'
);

// Replace getTotal
const oldGetTotal = `  const getTotal = (field) => {
    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";
    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {
      const prefix = \\\`\\\${selectedWorkerData.cedula}_\\\${row.dia}\\\`;
      const val = overrides[\\\`\\\${prefix}_\\\${field}\\\`] !== undefined ? overrides[\\\`\\\${prefix}_\\\${field}\\\`] : row[field];
      return acc + (Number(val) || 0);
    }, 0);
    return sum === 0 ? "0.0" : sum.toFixed(1);
  };`;

const newGetTotal = `  const getTotal = (field) => {
    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";
    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {
      const prefix = \\\`\\\${selectedWorkerData.cedula}_\\\${row.dia}\\\`;
      const val = overrides[\\\`\\\${prefix}_\\\${field}\\\`] !== undefined ? overrides[\\\`\\\${prefix}_\\\${field}\\\`] : row[field];
      const num = parseFloat(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    return sum === 0 ? "0.0" : sum.toFixed(1);
  };`;

content = content.replace(/  const getTotal = \(field\) => \{[\s\S]*?return sum === 0 \? "0\.0" : sum\.toFixed\(1\);\n  \};/, newGetTotal.replace(/\\`/g, '`').replace(/\\\$/g, '$'));

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
