const fs = require('fs');

let content = fs.readFileSync('src/app/nomina/page.js', 'utf8');

// 1. Replace the first useEffect
const oldUseEffect = `  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem("optinomina_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.attendanceLogs) setAttendanceLogs(parsed.attendanceLogs);
        if (parsed.overrides) setOverrides(parsed.overrides);
      }
    } catch (e) {
      console.error("Error parsing optinomina_draft", e);
    }
    setDataLoaded(true);
  }, []);`;

const newUseEffect = `  useEffect(() => {
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

content = content.replace(oldUseEffect, newUseEffect);

// 2. Replace handleSaveDraft
const oldHandleSaveDraft = `  const handleSaveDraft = () => {
    localStorage.setItem('optinomina_draft', JSON.stringify({ attendanceLogs, overrides }));
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 2000);
  };`;

const newHandleSaveDraft = `  const handleSaveDraft = () => {
    try {
      const payload = { attendanceLogs, overrides };
      localStorage.setItem('optinomina_draft', JSON.stringify(payload));
      console.log("Borrador guardado:", payload);
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 2000);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el borrador. Revisa la consola.");
    }
  };`;

content = content.replace(oldHandleSaveDraft, newHandleSaveDraft);

// 3. Prevent loadEmployees from overwriting draft
const oldLoadEmployeesWipe = `        setNominaRows(masterEmployees);
        setAttendanceLogs({});
        setOverrides({});`;
const newLoadEmployeesWipe = `        setNominaRows(masterEmployees);
        // Only clear if no draft was loaded to prevent overwriting local draft
        setAttendanceLogs(prev => Object.keys(prev).length > 0 ? prev : {});
        setOverrides(prev => Object.keys(prev).length > 0 ? prev : {});`;

content = content.replace(oldLoadEmployeesWipe, newLoadEmployeesWipe);

fs.writeFileSync('src/app/nomina/page.js', content, 'utf8');
console.log('Done!');
