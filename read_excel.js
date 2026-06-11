const XLSX = require('xlsx');

const workbook = XLSX.readFile('C:\\Users\\Usuario\\Downloads\\Reporte de Marcaciones_20260528144543_export.xlsx');
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Print first 50 rows
for (let i = 0; i < Math.min(50, data.length); i++) {
  console.log(data[i]);
}
