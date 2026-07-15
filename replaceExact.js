const fs = require('fs');

const code = fs.readFileSync('src/components/Nomina/TabLiquidacion.jsx', 'utf8');

const regex = /<input type="text" inputMode="decimal"[\s\S]*?className="[^"]+" \/>/g;
let matches = code.match(regex) || [];

console.log(`Found ${matches.length} inputs.`);

let newCode = code;

matches.forEach(match => {
  // Extract key and fallback from value
  // value={overrides[`KEY`] !== undefined ? overrides[`KEY`] : Number(FALLBACK).toFixed(1)}
  // OR value={overrides[`KEY`] !== undefined ? overrides[`KEY`] : FALLBACK}
  // OR value={FALLBACK}  with onChange={(e) => handleCellEdit(`KEY`, ...)}
  
  let key, fallback;
  
  // Try to find the handleCellEdit key
  const hcMatch = match.match(/handleCellEdit\(`([^`]+)`/);
  if (hcMatch) {
    key = hcMatch[1];
  }
  
  if (!key) {
    console.error("NO KEY FOUND IN MATCH:\n" + match);
    return;
  }
  
  // Try to find fallback in value={overrides[`${key}`] !== undefined ? overrides[`${key}`] : FALLBACK}
  const valMatch = match.match(/value=\{overrides\[`[^`]+`\] !== undefined \? overrides\[`[^`]+`\] : (.*?)\}/);
  if (valMatch) {
    fallback = valMatch[1].trim();
    if (fallback.startsWith("Number(") && fallback.endsWith(".toFixed(1)")) {
      fallback = fallback.substring(7, fallback.length - 11);
    }
  } else {
    // Maybe it's value={vExtNoc}
    const valMatch2 = match.match(/value=\{([^}]+)\}/);
    if (valMatch2) {
      fallback = valMatch2[1].trim();
    }
  }
  
  const classMatch = match.match(/className="([^"]+)"/);
  const className = classMatch ? classMatch[1] : "";
  
  const replacement = `<GridInput globalValue={overrides[\`${key}\`]} fallback={${fallback}} onSave={(val) => handleCellEdit(\`${key}\`, val)} className="${className}" />`;
  
  newCode = newCode.replace(match, replacement);
});

// Add the GridInput component
const gridInputDefinition = `const GridInput = ({ globalValue, fallback, onSave, className }) => {
  const [localVal, React_useState] = React.useState(() => {
    if (globalValue !== undefined && globalValue !== "") return globalValue.toString();
    if (globalValue === "") return "";
    return Number(fallback).toFixed(1);
  });

  React.useEffect(() => {
    if (globalValue !== undefined) {
      React_useState(globalValue.toString());
    } else {
      React_useState(globalValue === "" ? "" : Number(fallback).toFixed(1));
    }
  }, [globalValue, fallback]);

  const handleBlur = () => {
    let cleanVal = localVal.toString().replace(',', '.');
    if (cleanVal === "") {
      onSave("");
    } else if (!isNaN(parseFloat(cleanVal))) {
      const finalNum = parseFloat(cleanVal).toString();
      onSave(finalNum);
      React_useState(finalNum);
    } else {
      onSave(0);
      React_useState("0");
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
      onChange={(e) => React_useState(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};`;

if (!newCode.includes('const GridInput =')) {
  newCode = newCode.replace('export default function TabLiquidacion', gridInputDefinition + '\n\nexport default function TabLiquidacion');
  
  // Also we need useState, useEffect. But I used React.useState above, which is fine since React is imported!
  // Wait, I should rename React_useState to setLocalVal.
}

newCode = newCode.replace(/React_useState/g, 'setLocalVal');

fs.writeFileSync('src/components/Nomina/TabLiquidacion.jsx', newCode, 'utf8');
console.log('Replaced successfully!');
