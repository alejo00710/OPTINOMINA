const fs = require('fs');

let content = fs.readFileSync('src/app/nomina/page.js', 'utf8');

// 1. Simplify the first useEffect to only handle client mounting state
const oldUseEffect = `  useEffect(() => {
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

const newUseEffect = `  useEffect(() => {
    setIsClient(true);
    setDataLoaded(true);
  }, []);`;

content = content.replace(oldUseEffect, newUseEffect);

// 2. Centralize hydration in loadEmployees
const oldLoadEmployeesWipe = `        // TAREA 3: Iniciar en blanco (solo cargar masterEmployees y estados vacíos)
        setNominaRows(masterEmployees);
        // Only clear if no draft was loaded to prevent overwriting local draft
        setAttendanceLogs(prev => Object.keys(prev).length > 0 ? prev : {});
        setOverrides(prev => Object.keys(prev).length > 0 ? prev : {});`;

const newLoadEmployeesWipe = `        setNominaRows(masterEmployees);

        const savedDraft = typeof window !== 'undefined' ? localStorage.getItem('optinomina_draft') : null;
        let hasDraft = false;

        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            // Verificamos que sea un objeto con llaves, no un array
            if (parsed.attendanceLogs && Object.keys(parsed.attendanceLogs).length > 0) {
              setAttendanceLogs(parsed.attendanceLogs);
              setOverrides(parsed.overrides || {});
              hasDraft = true;
              console.log("✅ Borrador restaurado, ignorando plantillas vacías.");
            }
          } catch(e) {
            console.error("Error leyendo borrador:", e);
          }
        }

        // SOLO SI NO HAY BORRADOR válido en memoria, procedemos a aplastar el estado con la plantilla limpia:
        if (!hasDraft) {
          console.log("📝 No hay borrador, iniciando grilla en blanco...");
          setAttendanceLogs({});
          setOverrides({});
        }`;

content = content.replace(oldLoadEmployeesWipe, newLoadEmployeesWipe);

fs.writeFileSync('src/app/nomina/page.js', content, 'utf8');
console.log('Done!');
