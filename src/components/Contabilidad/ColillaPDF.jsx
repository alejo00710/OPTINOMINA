import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  title: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  employeeBlock: {
    marginBottom: 25,
  },
  employeeHeader: {
    backgroundColor: '#1e293b',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  empHeaderCol: {
    flex: 1,
  },
  empLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  empValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 0,
  },
  sectionTitleBox: {
    backgroundColor: '#f8fafc',
    padding: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailConcept: {
    fontSize: 8,
    color: '#475569',
    flex: 1,
  },
  detailValue: {
    fontSize: 9,
    color: '#0f172a',
    textAlign: 'right',
    fontWeight: 'medium',
    width: 120,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalConcept: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  finalRow: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  finalConcept: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  finalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'right',
  }
});

const formatMoney = (val) => {
  if (!val) return '$ 0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

const DetailRow = ({ label, value, isMoney = true, forceShow = false }) => {
  if (!forceShow && (value === undefined || value === null || value === '' || Number(value) === 0)) return null;
  const displayValue = isMoney ? formatMoney(value) : value;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailConcept}>{label}</Text>
      <Text style={styles.detailValue}>{displayValue}</Text>
    </View>
  );
};

const DetailRowCombined = ({ label, qty, qtyLabel, money }) => {
  const numQty = Number(qty) || 0;
  const numMoney = Number(money) || 0;
  if (numQty === 0 && numMoney === 0) return null;
  
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailConcept}>{label} {numQty > 0 ? `(${numQty} ${qtyLabel})` : ''}</Text>
      <Text style={styles.detailValue}>{numMoney !== 0 ? formatMoney(money) : '-'}</Text>
    </View>
  );
};

export default function ColillaPDF({ empleados = [], identificador = "SÁBANA CONSOLIDADA DETALLADA" }) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>OPTIMOLDES</Text>
          </View>
          <View>
            <Text style={styles.title}>{identificador}</Text>
          </View>
        </View>

        {empleados.map((emp, index) => {
          return (
            <View style={styles.employeeBlock} key={emp.cedula || index} wrap={false}>
              
              {/* Encabezado */}
              <View style={styles.employeeHeader}>
                <View style={styles.empHeaderCol}>
                  <Text style={styles.empLabel}>Nombre</Text>
                  <Text style={styles.empValue}>{emp.nombre}</Text>
                </View>
                <View style={styles.empHeaderCol}>
                  <Text style={styles.empLabel}>Documento</Text>
                  <Text style={styles.empValue}>{emp.cedula}</Text>
                </View>
                <View style={styles.empHeaderCol}>
                  <Text style={styles.empLabel}>Cargo</Text>
                  <Text style={styles.empValue}>{emp.cargo || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.section}>
                
                {/* Devengos Básicos */}
                <View style={styles.sectionTitleBox}>
                  <Text style={styles.sectionTitle}>Devengos Básicos</Text>
                </View>
                <DetailRow label="Salario Base" value={emp.salario} forceShow={true} />
                <DetailRow label="Días Pagados" value={`${emp.dias_pagados || 0} días`} isMoney={false} forceShow={true} />
                <DetailRow label="Sueldo" value={emp.sueldo} forceShow={true} />
                <DetailRow label="Comisiones" value={emp.comisiones} />
                <DetailRow label="Auxilio de Transporte" value={emp.transporte} />
                <DetailRow label="Rodamiento" value={emp.rodamiento} />
                <DetailRow label="Bonif. No Salarial" value={emp.bonificacion_no_salarial || emp.bonificacion} />
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalConcept}>Total Devengado</Text>
                  <Text style={styles.totalValue}>{formatMoney(emp.total_devengados || emp.total_devengado)}</Text>
                </View>

                {/* Liquidación de Novedades */}
                <View style={styles.sectionTitleBox}>
                  <Text style={styles.sectionTitle}>Liquidación de Novedades</Text>
                </View>
                <DetailRowCombined label="Incapacidad" qty={emp.dias_incapacidad} qtyLabel="días" money={emp.incapacidad} />
                <DetailRowCombined label="Lic. Remunerada" qty={emp.dias_lic_rem} qtyLabel="días" money={emp.val_lic_rem} />
                <DetailRowCombined label="Lic. No Remunerada" qty={emp.dias_lic_norem} qtyLabel="días" money={emp.val_lic_norem} />
                <DetailRowCombined label="Incap. AT" qty={emp.dias_incap_at} qtyLabel="días" money={emp.val_incap_at} />
                <DetailRowCombined label="Calamidad" qty={emp.dias_calamidad} qtyLabel="días" money={emp.val_calamidad} />
                <DetailRowCombined label="Sanción" qty={emp.dias_sancion} qtyLabel="días" money={emp.val_sancion} />
                <DetailRow label="Vacaciones" value={emp.val_vacaciones} />

                {/* Trabajo Suplementario */}
                <View style={styles.sectionTitleBox}>
                  <Text style={styles.sectionTitle}>Trabajo Suplementario</Text>
                </View>
                <DetailRowCombined label="Horas Diurnas" qty={emp.horas_diurnas} qtyLabel="hrs" money={0} />
                <DetailRowCombined label="Horas Nocturnas" qty={emp.horas_nocturnas} qtyLabel="hrs" money={0} />
                <DetailRowCombined label="Ext. Diurnas" qty={emp.extras_diurnas} qtyLabel="hrs" money={emp.val_extras_diurnas} />
                <DetailRowCombined label="Ext. Nocturnas" qty={emp.extras_nocturnas} qtyLabel="hrs" money={emp.val_extras_nocturnas} />
                <DetailRowCombined label="Ext. Festivas" qty={emp.extras_festivas} qtyLabel="hrs" money={emp.val_extras_festivas} />
                <DetailRow label="Recargo Nocturno" value={emp.recargo_nocturno} />

                {/* Deducciones y Retenciones */}
                <View style={styles.sectionTitleBox}>
                  <Text style={styles.sectionTitle}>Deducciones y Retenciones</Text>
                </View>
                <DetailRow label="Salud (4%)" value={emp.salud} />
                <DetailRow label="Pensión (4%)" value={emp.pension} />
                <DetailRow label="Solidaridad (1%)" value={emp.solidaridad} />
                <DetailRow label="Préstamos" value={emp.prestamos} />
                <DetailRow label="Póliza Bolívar" value={emp.poliza_bolivar} />
                <DetailRow label="Póliza Plenitud" value={emp.poliza_plenitud} />
                <DetailRow label="Comfama" value={emp.libranza_comfama} />
                <DetailRow label="Póliza Sura" value={emp.poliza_sura} />
                <DetailRow label="Óptica" value={emp.optica} />
                <DetailRow label="Celular" value={emp.celular} />
                <DetailRow label="Retención" value={emp.retencion} />
                <DetailRow label="Saldo Préstamo" value={emp.saldo_prestamo} />
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalConcept}>Total Deducido</Text>
                  <Text style={styles.totalValue}>{formatMoney(emp.total_deducciones || emp.total_deducido)}</Text>
                </View>

                {/* Liquidación Final */}
                <View style={styles.sectionTitleBox}>
                  <Text style={styles.sectionTitle}>Liquidación Final</Text>
                </View>
                <DetailRow label="Total a Pagar" value={emp.total_pagar} />
                <DetailRow label="Verificación (40%)" value={emp.verificacion} />
                
                <View style={styles.finalRow}>
                  <Text style={styles.finalConcept}>NETO A PAGAR</Text>
                  <Text style={styles.finalValue}>{formatMoney(emp.neto_pagar)}</Text>
                </View>

              </View>
            </View>
          );
        })}
        
      </Page>
    </Document>
  );
}
