const fs = require('fs');
let c = fs.readFileSync('src/components/Nomina/TabLiquidacion.jsx', 'utf8');

const s = c.split('\n');
s.splice(57, 6,
'  const getTotal = (field) => {',
'    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";',
'    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {',
'      const prefix = `${selectedWorkerData.cedula}_${row.dia}`;',
'      const val = overrides[`${prefix}_${field}`] !== undefined ? overrides[`${prefix}_${field}`] : row[field];',
'      return acc + (Number(val) || 0);',
'    }, 0);',
'    return sum === 0 ? "0.0" : sum.toFixed(1);',
'  };'
);
fs.writeFileSync('src/components/Nomina/TabLiquidacion.jsx', s.join('\n'), 'utf8');
console.log('Fixed getTotal!');
