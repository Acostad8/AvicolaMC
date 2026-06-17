import { format, parseISO, differenceInWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date) {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

export function formatNumber(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CO').format(n)
}

export function formatPercent(n) {
  if (n == null) return '—'
  return `${Number(n).toFixed(2)}%`
}

export function calcWeeksAge(fechaIngreso) {
  if (!fechaIngreso) return null
  try {
    return differenceInWeeks(new Date(), parseISO(fechaIngreso))
  } catch {
    return null
  }
}

export function calcPostura(huevos, aves) {
  if (!huevos || !aves || aves === 0) return 0
  return parseFloat(((huevos / aves) * 100).toFixed(2))
}

export function downloadCSV(data, filename) {
  if (!data || data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const CAUSAS_MORTALIDAD = [
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'accidente', label: 'Accidente' },
  { value: 'causa_desconocida', label: 'Causa desconocida' },
  { value: 'depredador', label: 'Depredador' },
  { value: 'calor_frio_extremo', label: 'Calor/frío extremo' },
  { value: 'otra', label: 'Otra' },
]

export const TIPOS_TRATAMIENTO = [
  { value: 'vacunacion', label: 'Vacunación' },
  { value: 'medicacion', label: 'Medicación' },
  { value: 'desparasitacion', label: 'Desparasitación' },
  { value: 'vitaminas', label: 'Vitaminas' },
  { value: 'antibiotico', label: 'Antibiótico' },
  { value: 'otro', label: 'Otro' },
]

export const UNIDADES_MEDIDA = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'lb', label: 'Libras (lb)' },
  { value: 'litro', label: 'Litros (L)' },
  { value: 'ml', label: 'Mililitros (mL)' },
  { value: 'unidad', label: 'Unidades' },
  { value: 'saco', label: 'Sacos' },
  { value: 'caja', label: 'Cajas' },
  { value: 'dosis', label: 'Dosis' },
]

export const CATEGORIAS_INSUMO = [
  { value: 'alimento', label: 'Alimento' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'vacuna', label: 'Vacuna' },
  { value: 'desinfectante', label: 'Desinfectante' },
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'otro', label: 'Otro' },
]

export const TIPOS_PROVEEDOR = [
  { value: 'insumos', label: 'Proveedor de insumos' },
  { value: 'razas', label: 'Proveedor de aves/razas' },
  { value: 'ambos', label: 'Insumos y aves' },
  { value: 'otro', label: 'Otro' },
]

export const TIPOS_AVE = [
  { value: 'ponedoras', label: 'Ponedoras' },
]

export function getLabelFromValue(arr, value) {
  return arr.find(i => i.value === value)?.label ?? value ?? '—'
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
