const fs = require('fs');
const path = 'src/components/Nomina/TabLiquidacion.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add GridInput component before `export default function TabLiquidacion`
const gridInputDefinition = `
const GridInput = ({ globalValue, fallback, onSave, className }) => {
  const [localVal, setLocalVal] = React.useState(() => {
    if (globalValue !== undefined && globalValue !== "") return globalValue.toString();
    if (globalValue === "") return "";
    return Number(fallback).toFixed(1);
  });

  React.useEffect(() => {
    if (globalValue !== undefined) {
      setLocalVal(globalValue.toString());
    } else {
      setLocalVal(globalValue === "" ? "" : Number(fallback).toFixed(1));
    }
  }, [globalValue, fallback]);

  const handleBlur = () => {
    let cleanVal = localVal.toString().replace(',', '.');
    if (cleanVal === "") {
      onSave("");
    } else if (!isNaN(parseFloat(cleanVal))) {
      const finalNum = parseFloat(cleanVal).toString();
      onSave(finalNum);
      setLocalVal(finalNum);
    } else {
      onSave(0);
      setLocalVal("0");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={localVal}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};
`;

if (!content.includes('const GridInput =')) {
  content = content.replace('export default function TabLiquidacion', gridInputDefinition + '\nexport default function TabLiquidacion');
}

// 2. Replace the complex <input> tags
// The inputs look exactly like this:
// <input type="text" inputMode="decimal" value={overrides[`...`] !== undefined ? overrides[`...`] : Number(...).toFixed(1)} onChange={(e) => { ... }} onFocus={(e) => e.target.select()} className="..." />
// Wait, the "Money" ones have a different fallback: value={vExtNoc} or value={overrides[...] !== undefined ? overrides[...] : Number(...).toFixed(1)}

// We can replace the 14 grid hour inputs:
// value={overrides[`${prefix}_hr_ord_diu`] !== undefined ? overrides[`${prefix}_hr_ord_diu`] : Number(row.hr_ord_diu || 0).toFixed(1)}
// which is: value={overrides[`([a-zA-Z0-9_\${}]+)`] !== undefined \? overrides\[`\1`\] : Number\(([^)]+)\)\.toFixed\(1\)}

// The onChange is:
// onChange=\{\(e\) => \{\s*let val = [^}]+\}\s*\}\}\s*

const regexHourlyInputs = /<input type="text" inputMode="decimal" value=\{overrides\[`([^`]+)`\] !== undefined \? overrides\[`\1`\] : Number\(([^)]+)\)\.toFixed\(1\)\} onChange=\{\(e\) => \{[\s\S]*?handleCellEdit\(`\1`, val\);\s*\}\s*\}\}\s*onFocus=\{\(e\) => e\.target\.select\(\)\} className="([^"]+)" \/>/g;

content = content.replace(regexHourlyInputs, (match, key, fallback, className) => {
  return `<GridInput globalValue={overrides[\`${key}\`]} fallback={${fallback}} onSave={(val) => handleCellEdit(\`${key}\`, val)} className="${className}" />`;
});

// For money inputs:
// value={vExtNoc} 
// onChange={(e) => { ... handleCellEdit(`${selectedWorkerData.cedula}_vr_ext_noc`, val) ... }}
// But wait! vExtNoc is just a local variable. Where does it get fallback from?
// const vExtNoc = overrides[`${selectedWorkerData.cedula}_vr_ext_noc`] !== undefined ? overrides[`${selectedWorkerData.cedula}_vr_ext_noc`] : Math.round((salario_base / 240) * 1.75 * totalExtraNoc);
// So fallback for vExtNoc is basically vExtNoc itself if we pass it, but wait!
// GridInput uses fallback like: Number(fallback).toFixed(1). That might turn a big money number like 35000 into 35000.0, which is fine!
// Or we can just use vExtNoc directly.

// Wait, the regex for money inputs or summary inputs:
// <input type="text" inputMode="decimal" value=\{([a-zA-Z0-9_]+)\} onChange=\{\(e\) => \{[\s\S]*?handleCellEdit\(`([^`]+)`, val\);\s*\}\s*\}\}\s*onFocus=\{\(e\) => e\.target\.select\(\)\} className="([^"]+)" \/>

const regexVarInputs = /<input type="text" inputMode="decimal" value=\{([a-zA-Z0-9_]+)\} onChange=\{\(e\) => \{[\s\S]*?handleCellEdit\(`([^`]+)`, val\);\s*\}\s*\}\}\s*onFocus=\{\(e\) => e\.target\.select\(\)\} className="([^"]+)" \/>/g;

content = content.replace(regexVarInputs, (match, valVar, key, className) => {
  // If valVar is already the fallback or the state, it's safer to pass globalValue={overrides[`key`]} and fallback={valVar}
  // Because if overrides is empty, valVar is the fallback.
  return `<GridInput globalValue={overrides[\`${key}\`]} fallback={${valVar}} onSave={(val) => handleCellEdit(\`${key}\`, val)} className="${className}" />`;
});


// There are also some summary hours inputs:
// <input type="text" inputMode="decimal" value={overrides[`${selectedWorkerData.cedula}_tot_hr_ext_noc`] !== undefined ? overrides[`${selectedWorkerData.cedula}_tot_hr_ext_noc`] : Number(totalExtraNoc).toFixed(1)} ...

content = content.replace(regexHourlyInputs, (match, key, fallback, className) => {
  return `<GridInput globalValue={overrides[\`${key}\`]} fallback={${fallback}} onSave={(val) => handleCellEdit(\`${key}\`, val)} className="${className}" />`;
});


fs.writeFileSync(path, content, 'utf8');
console.log('Replaced successfully!');
