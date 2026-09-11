import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  title: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  employeeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableRowHeader: {
    margin: 'auto',
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
  },
  tableColLeft: {
    width: '60%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColRight: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 6,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
  },
  tableCell: {
    margin: 6,
    fontSize: 10,
    color: '#475569',
  },
  tableCellMoney: {
    margin: 6,
    fontSize: 10,
    color: '#475569',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsBox: {
    width: '50%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  netoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  netoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  netoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    alignItems: 'center',
    paddingTop: 8,
  },
  signatureText: {
    fontSize: 10,
    color: '#64748b',
  }
});

const formatMoney = (val) => {
  if (!val) return '$ 0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

export default function ColillaPDF({ empleados = [], identificador = "COMPROBANTE DE PAGO" }) {
  return (
    <Document>
      {empleados.map((emp, index) => (
        <Page key={emp.cedula || index} size="LETTER" style={styles.page}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.companyName}>OPTIMOLDES</Text>
            </View>
            <View>
              <Text style={styles.title}>{identificador}</Text>
            </View>
          </View>

          {/* Employee Info */}
          <View style={styles.employeeInfo}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Nombre del Empleado</Text>
              <Text style={styles.infoValue}>{emp.nombre}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Documento</Text>
              <Text style={styles.infoValue}>{emp.cedula}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Cargo</Text>
              <Text style={styles.infoValue}>{emp.cargo || 'N/A'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Salario Base</Text>
              <Text style={styles.infoValue}>{formatMoney(emp.salario)}</Text>
            </View>
          </View>

          {/* Devengos */}
          <Text style={styles.sectionTitle}>Ingresos y Devengos</Text>
          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <View style={styles.tableColLeft}><Text style={styles.tableCellHeader}>Concepto</Text></View>
              <View style={styles.tableColRight}><Text style={styles.tableCellHeader}>Valor</Text></View>
            </View>
            
            {Number(emp.sueldo) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Sueldo Básico ({emp.dias_pagados} días)</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.sueldo)}</Text></View>
              </View>
            )}
            
            {Number(emp.transporte) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Auxilio de Transporte</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.transporte)}</Text></View>
              </View>
            )}
            
            {Number(emp.val_extras_diurnas) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Horas Extras Diurnas</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.val_extras_diurnas)}</Text></View>
              </View>
            )}
            
            {Number(emp.val_extras_nocturnas) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Horas Extras Nocturnas</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.val_extras_nocturnas)}</Text></View>
              </View>
            )}

            {Number(emp.recargo_nocturno) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Recargo Nocturno</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.recargo_nocturno)}</Text></View>
              </View>
            )}

            {Number(emp.val_vacaciones) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Vacaciones</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.val_vacaciones)}</Text></View>
              </View>
            )}
          </View>

          {/* Deducciones */}
          <Text style={styles.sectionTitle}>Deducciones y Retenciones</Text>
          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <View style={styles.tableColLeft}><Text style={styles.tableCellHeader}>Concepto</Text></View>
              <View style={styles.tableColRight}><Text style={styles.tableCellHeader}>Valor</Text></View>
            </View>
            
            {Number(emp.salud) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Aporte a Salud (4%)</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.salud)}</Text></View>
              </View>
            )}
            
            {Number(emp.pension) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Aporte a Pensión (4%)</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.pension)}</Text></View>
              </View>
            )}
            
            {Number(emp.prestamos) > 0 && (
              <View style={styles.tableRow}>
                <View style={styles.tableColLeft}><Text style={styles.tableCell}>Préstamos</Text></View>
                <View style={styles.tableColRight}><Text style={styles.tableCellMoney}>{formatMoney(emp.prestamos)}</Text></View>
              </View>
            )}
          </View>

          {/* Totals */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Devengado:</Text>
                <Text style={styles.totalValue}>{formatMoney(emp.total_devengados)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Deducido:</Text>
                <Text style={styles.totalValue}>{formatMoney(emp.total_deducciones)}</Text>
              </View>
              <View style={styles.netoRow}>
                <Text style={styles.netoLabel}>NETO A PAGAR:</Text>
                <Text style={styles.netoValue}>{formatMoney(emp.neto_pagar)}</Text>
              </View>
            </View>
          </View>

          {/* Footer Signatures */}
          <View style={styles.footer}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>Firma de la Empresa</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>Firma del Empleado</Text>
            </View>
          </View>
          
        </Page>
      ))}
    </Document>
  );
}
