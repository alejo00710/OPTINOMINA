const fs = require('fs');

let content = fs.readFileSync('src/components/Nomina/TabLiquidacion.jsx', 'utf8');

// 1. Update GridInput signature and toFixed usage
content = content.replace(
  'const GridInput = ({ globalValue, fallback, onSave, className }) => {',
  'const GridInput = ({ globalValue, fallback, onSave, className, decimals = 1 }) => {'
);
content = content.replace(/Number\(fallback\)\.toFixed\(1\)/g, 'Number(fallback).toFixed(decimals)');
content = content.replace(/\[globalValue, fallback\]\);/g, '[globalValue, fallback, decimals]);');

// 2. Add decimals={0} to all vr_ GridInputs
const vrFields = ['nocturnas', 'fes_diu', 'fes_noc', 'ext_diu', 'ext_noc', 'ext_fes_diu', 'ext_fes_noc'];
vrFields.forEach(field => {
  const searchRegex = new RegExp(`(<GridInput globalValue=\\{overrides\\[\\\`\\$\\{selectedWorkerData\\.cedula\\}_vr_${field}\\\`\\]\\} fallback=\\{[a-zA-Z]+\\} onSave=\\{\\(val\\) => handleCellEdit\\(\\\`\\$\\{selectedWorkerData\\.cedula\\}_vr_${field}\\\`, val\\)\\} className="[^"]+") />`);
  content = content.replace(searchRegex, '$1 decimals={0} />');
});

// 3. Replace the static $0 for Diurnas
// In the current file, line is: <td className="py-3 px-4 text-right text-slate-500">$0</td>
const diurnasStatic = `<td className="py-3 px-4 text-right text-slate-500">$0</td>`;
const diurnasDynamic = `<td className="py-2 px-2 text-right">
                                               <div className="flex justify-end items-center gap-1">
                                                  <span className="text-slate-500">$</span>
                                                  <GridInput globalValue={overrides[\`\${selectedWorkerData.cedula}_vr_diurnas\`]} fallback={0} onSave={(val) => handleCellEdit(\`\${selectedWorkerData.cedula}_vr_diurnas\`, val)} className="w-24 bg-transparent text-right text-slate-500 outline-none focus:ring-1 rounded" decimals={0} />
                                               </div>
                                            </td>`;

content = content.replace(diurnasStatic, diurnasDynamic);

fs.writeFileSync('src/components/Nomina/TabLiquidacion.jsx', content, 'utf8');
console.log('Successfully updated decimals and Diurnas input!');
