const fs = require('fs');

let content = fs.readFileSync('src/app/nomina/page.js', 'utf8');

const oldUseEffect = `  useEffect(() => {
    setIsClient(true);
    try {
      const savedDraft = localStorage.getItem('optinomina_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.attendanceLogs && Object.keys(parsed.attendanceLogs).length > 0) {
          setAttendanceLogs(parsed.attendanceLogs);
        }
        if (parsed.overrides && Object.keys(parsed.overrides).length > 0) {
          setOverrides(parsed.overrides);
        }
        console.log("Borrador cargado con éxito:", parsed);
      }
    } catch (error) {
      console.error("Error al leer el borrador:", error);
    } finally {
      setDataLoaded(true);
    }
  }, []);`;

const newUseEffect = `  useEffect(() => {
    setIsClient(true);
    try {
      const savedDraft = localStorage.getItem('optinomina_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        
        // attendanceLogs es un OBJETO, por lo tanto usamos Object.keys() para verificar si tiene datos
        if (parsed.attendanceLogs && Object.keys(parsed.attendanceLogs).length > 0) {
          setAttendanceLogs(parsed.attendanceLogs);
        }
        
        // overrides también es un OBJETO
        if (parsed.overrides && Object.keys(parsed.overrides).length > 0) {
          setOverrides(parsed.overrides);
        }
        
        console.log("✅ Borrador cargado con éxito en la memoria");
      }
    } catch (error) {
      console.error("❌ Error al leer el borrador:", error);
    } finally {
      setDataLoaded(true); 
    }
  }, []);`;

content = content.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('src/app/nomina/page.js', content, 'utf8');
console.log('Done!');
