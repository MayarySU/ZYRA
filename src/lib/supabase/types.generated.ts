
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "accion": string,"empleado_id": number | null,"entidad": string,"entidad_id": string | null,"fecha": string,"id_audit": number,"usuario_id": string | null,"valores_anteriores": Json | null,"valores_nuevos": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion": string,"empleado_id"?: number | null,"entidad": string,"entidad_id"?: string | null,"fecha"?: string,"id_audit"?: number,"usuario_id"?: string | null,"valores_anteriores"?: Json | null,"valores_nuevos"?: Json | null
                  }
                  Update: {
                    "accion"?: string,"empleado_id"?: number | null,"entidad"?: string,"entidad_id"?: string | null,"fecha"?: string,"id_audit"?: number,"usuario_id"?: string | null,"valores_anteriores"?: Json | null,"valores_nuevos"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "audit_log_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id_usuario"]
    }
                  ]
                },"avances": {
                  Row: {
                    "creado_en": string,"descripcion": string,"empleado_id": number | null,"id_avance": number,"operation_id": string | null,"porcentaje": number | null,"proyecto_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"descripcion": string,"empleado_id"?: number | null,"id_avance"?: number,"operation_id"?: string | null,"porcentaje"?: number | null,"proyecto_id": number
                  }
                  Update: {
                    "creado_en"?: string,"descripcion"?: string,"empleado_id"?: number | null,"id_avance"?: number,"operation_id"?: string | null,"porcentaje"?: number | null,"proyecto_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "avances_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "avances_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "avances_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    }
                  ]
                },"checklist_detalle": {
                  Row: {
                    "actualizado_en": string,"cantidad_cargada": number,"cantidad_requerida": number,"checklist_id": number,"empleado_id": number | null,"id_checklist_detalle": number,"marcado": boolean,"material_id": number,"observaciones": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"cantidad_cargada"?: number,"cantidad_requerida"?: number,"checklist_id": number,"empleado_id"?: number | null,"id_checklist_detalle"?: number,"marcado"?: boolean,"material_id": number,"observaciones"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"cantidad_cargada"?: number,"cantidad_requerida"?: number,"checklist_id"?: number,"empleado_id"?: number | null,"id_checklist_detalle"?: number,"marcado"?: boolean,"material_id"?: number,"observaciones"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_detalle_checklist_id_fkey"
      columns: ["checklist_id"]
isOneToOne: false
      referencedRelation: "checklists"
      referencedColumns: ["id_checklist"]
    },{
      foreignKeyName: "checklist_detalle_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "checklist_detalle_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiales"
      referencedColumns: ["id_material"]
    }
                  ]
                },"checklist_servicio": {
                  Row: {
                    "creado_en": string,"empresa_id": number,"id_checklist_servicio": number,"nombre": string,"servicio_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"empresa_id": number,"id_checklist_servicio"?: number,"nombre": string,"servicio_id"?: number | null
                  }
                  Update: {
                    "creado_en"?: string,"empresa_id"?: number,"id_checklist_servicio"?: number,"nombre"?: string,"servicio_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_servicio_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    },{
      foreignKeyName: "checklist_servicio_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id_servicio"]
    }
                  ]
                },"checklist_servicio_detalle": {
                  Row: {
                    "cantidad_requerida": number,"checklist_servicio_id": number,"id_checklist_servicio_detalle": number,"material_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad_requerida"?: number,"checklist_servicio_id": number,"id_checklist_servicio_detalle"?: number,"material_id": number
                  }
                  Update: {
                    "cantidad_requerida"?: number,"checklist_servicio_id"?: number,"id_checklist_servicio_detalle"?: number,"material_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_servicio_detalle_checklist_servicio_id_fkey"
      columns: ["checklist_servicio_id"]
isOneToOne: false
      referencedRelation: "checklist_servicio"
      referencedColumns: ["id_checklist_servicio"]
    },{
      foreignKeyName: "checklist_servicio_detalle_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiales"
      referencedColumns: ["id_material"]
    }
                  ]
                },"checklists": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"estado": string,"id_checklist": number,"observaciones": string | null,"proyecto_id": number,"verificado_en": string | null,"verificado_por": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"estado"?: string,"id_checklist"?: number,"observaciones"?: string | null,"proyecto_id": number,"verificado_en"?: string | null,"verificado_por"?: number | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"estado"?: string,"id_checklist"?: number,"observaciones"?: string | null,"proyecto_id"?: number,"verificado_en"?: string | null,"verificado_por"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklists_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "checklists_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "checklists_verificado_por_fkey"
      columns: ["verificado_por"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    }
                  ]
                },"clientes": {
                  Row: {
                    "actualizado_en": string,"correo": string | null,"creado_en": string,"direccion": string | null,"empresa_id": number,"id_cliente": number,"nombre": string,"razon_social": string | null,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"correo"?: string | null,"creado_en"?: string,"direccion"?: string | null,"empresa_id": number,"id_cliente"?: number,"nombre": string,"razon_social"?: string | null,"telefono"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"correo"?: string | null,"creado_en"?: string,"direccion"?: string | null,"empresa_id"?: number,"id_cliente"?: number,"nombre"?: string,"razon_social"?: string | null,"telefono"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    }
                  ]
                },"empleado_equipo": {
                  Row: {
                    "cargo": string | null,"creado_en": string,"empleado_id": number,"equipo_id": number,"es_lider": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "cargo"?: string | null,"creado_en"?: string,"empleado_id": number,"equipo_id": number,"es_lider"?: boolean
                  }
                  Update: {
                    "cargo"?: string | null,"creado_en"?: string,"empleado_id"?: number,"equipo_id"?: number,"es_lider"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "empleado_equipo_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "empleado_equipo_equipo_id_fkey"
      columns: ["equipo_id"]
isOneToOne: false
      referencedRelation: "equipos"
      referencedColumns: ["id_equipo"]
    }
                  ]
                },"empleados": {
                  Row: {
                    "activo": boolean,"actualizado_en": string,"correo": string | null,"creado_en": string,"empresa_id": number,"id_empleado": number,"nombre": string,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"actualizado_en"?: string,"correo"?: string | null,"creado_en"?: string,"empresa_id": number,"id_empleado"?: number,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"actualizado_en"?: string,"correo"?: string | null,"creado_en"?: string,"empresa_id"?: number,"id_empleado"?: number,"nombre"?: string,"telefono"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "empleados_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "actualizado_en": string,"correo": string | null,"creado_en": string,"direccion": string | null,"id_empresa": number,"nombre": string,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"correo"?: string | null,"creado_en"?: string,"direccion"?: string | null,"id_empresa"?: number,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"correo"?: string | null,"creado_en"?: string,"direccion"?: string | null,"id_empresa"?: number,"nombre"?: string,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"equipos": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"empresa_id": number,"id_equipo": number,"nombre_equipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"empresa_id": number,"id_equipo"?: number,"nombre_equipo": string
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"empresa_id"?: number,"id_equipo"?: number,"nombre_equipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    }
                  ]
                },"evidencias": {
                  Row: {
                    "avance_id": number | null,"content_type": string | null,"creado_en": string,"descripcion": string | null,"eliminado": boolean,"empleado_id": number | null,"fecha": string,"id_evidencia": string,"object_key": string,"proyecto_id": number,"size_bytes": number | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avance_id"?: number | null,"content_type"?: string | null,"creado_en"?: string,"descripcion"?: string | null,"eliminado"?: boolean,"empleado_id"?: number | null,"fecha"?: string,"id_evidencia"?: string,"object_key": string,"proyecto_id": number,"size_bytes"?: number | null,"tipo"?: string
                  }
                  Update: {
                    "avance_id"?: number | null,"content_type"?: string | null,"creado_en"?: string,"descripcion"?: string | null,"eliminado"?: boolean,"empleado_id"?: number | null,"fecha"?: string,"id_evidencia"?: string,"object_key"?: string,"proyecto_id"?: number,"size_bytes"?: number | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidencias_avance_id_fkey"
      columns: ["avance_id"]
isOneToOne: false
      referencedRelation: "avances"
      referencedColumns: ["id_avance"]
    },{
      foreignKeyName: "evidencias_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "evidencias_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "evidencias_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    }
                  ]
                },"materiales": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"empresa_id": number,"id_material": number,"nombre_material": string,"stock_disponible": number,"unidad": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"empresa_id": number,"id_material"?: number,"nombre_material": string,"stock_disponible"?: number,"unidad"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"empresa_id"?: number,"id_material"?: number,"nombre_material"?: string,"stock_disponible"?: number,"unidad"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "materiales_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    }
                  ]
                },"operaciones_procesadas": {
                  Row: {
                    "creado_en": string,"operation_id": string,"resultado": Json | null,"tipo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"operation_id": string,"resultado"?: Json | null,"tipo"?: string | null
                  }
                  Update: {
                    "creado_en"?: string,"operation_id"?: string,"resultado"?: Json | null,"tipo"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"proyecto_materiales": {
                  Row: {
                    "cantidad_requerida": number,"creado_en": string,"id_proyecto_material": number,"material_id": number,"proyecto_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad_requerida"?: number,"creado_en"?: string,"id_proyecto_material"?: number,"material_id": number,"proyecto_id": number
                  }
                  Update: {
                    "cantidad_requerida"?: number,"creado_en"?: string,"id_proyecto_material"?: number,"material_id"?: number,"proyecto_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyecto_materiales_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiales"
      referencedColumns: ["id_material"]
    },{
      foreignKeyName: "proyecto_materiales_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "proyecto_materiales_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    }
                  ]
                },"proyectos": {
                  Row: {
                    "actualizado_en": string,"cliente_id": number | null,"creado_en": string,"creado_por": string | null,"empresa_id": number,"equipo_id": number | null,"estado": string,"fecha_fin": string | null,"fecha_inicio": string | null,"id_proyecto": number,"imagen_url": string | null,"nombre_proyecto": string,"servicio_id": number | null,"ubicacion": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"cliente_id"?: number | null,"creado_en"?: string,"creado_por"?: string | null,"empresa_id": number,"equipo_id"?: number | null,"estado"?: string,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id_proyecto"?: number,"imagen_url"?: string | null,"nombre_proyecto": string,"servicio_id"?: number | null,"ubicacion"?: string | null,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"cliente_id"?: number | null,"creado_en"?: string,"creado_por"?: string | null,"empresa_id"?: number,"equipo_id"?: number | null,"estado"?: string,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id_proyecto"?: number,"imagen_url"?: string | null,"nombre_proyecto"?: string,"servicio_id"?: number | null,"ubicacion"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyectos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id_cliente"]
    },{
      foreignKeyName: "proyectos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id_usuario"]
    },{
      foreignKeyName: "proyectos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    },{
      foreignKeyName: "proyectos_equipo_id_fkey"
      columns: ["equipo_id"]
isOneToOne: false
      referencedRelation: "equipos"
      referencedColumns: ["id_equipo"]
    },{
      foreignKeyName: "proyectos_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id_servicio"]
    }
                  ]
                },"puntos_historial": {
                  Row: {
                    "cantidad_puntos": number,"empleado_id": number,"fecha": string,"id_punto": number,"motivo": string | null,"operation_id": string | null,"proyecto_id": number | null,"tipo_evento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad_puntos": number,"empleado_id": number,"fecha"?: string,"id_punto"?: number,"motivo"?: string | null,"operation_id"?: string | null,"proyecto_id"?: number | null,"tipo_evento": string
                  }
                  Update: {
                    "cantidad_puntos"?: number,"empleado_id"?: number,"fecha"?: string,"id_punto"?: number,"motivo"?: string | null,"operation_id"?: string | null,"proyecto_id"?: number | null,"tipo_evento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "puntos_historial_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "puntos_historial_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "puntos_historial_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    }
                  ]
                },"recordatorio_destinatarios": {
                  Row: {
                    "empleado_id": number,"leido": boolean,"leido_en": string | null,"recordatorio_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "empleado_id": number,"leido"?: boolean,"leido_en"?: string | null,"recordatorio_id": number
                  }
                  Update: {
                    "empleado_id"?: number,"leido"?: boolean,"leido_en"?: string | null,"recordatorio_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recordatorio_destinatarios_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "recordatorio_destinatarios_recordatorio_id_fkey"
      columns: ["recordatorio_id"]
isOneToOne: false
      referencedRelation: "recordatorios"
      referencedColumns: ["id_recordatorio"]
    }
                  ]
                },"recordatorios": {
                  Row: {
                    "activo": boolean,"actualizado_en": string,"creado_en": string,"creado_por": string | null,"descripcion": string | null,"empresa_id": number,"fecha": string | null,"hora": string | null,"id_recordatorio": number,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"descripcion"?: string | null,"empresa_id": number,"fecha"?: string | null,"hora"?: string | null,"id_recordatorio"?: number,"titulo": string
                  }
                  Update: {
                    "activo"?: boolean,"actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"descripcion"?: string | null,"empresa_id"?: number,"fecha"?: string | null,"hora"?: string | null,"id_recordatorio"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recordatorios_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id_usuario"]
    },{
      foreignKeyName: "recordatorios_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    }
                  ]
                },"reportes": {
                  Row: {
                    "actualizado_en": string,"comentarios": string | null,"creado_en": string,"empleado_id": number | null,"equipo_id": number | null,"es_final": boolean,"estado": string,"fecha_reporte": string,"id_reporte": number,"numero_reporte": string | null,"proyecto_id": number | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"comentarios"?: string | null,"creado_en"?: string,"empleado_id"?: number | null,"equipo_id"?: number | null,"es_final"?: boolean,"estado"?: string,"fecha_reporte"?: string,"id_reporte"?: number,"numero_reporte"?: string | null,"proyecto_id"?: number | null,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"comentarios"?: string | null,"creado_en"?: string,"empleado_id"?: number | null,"equipo_id"?: number | null,"es_final"?: boolean,"estado"?: string,"fecha_reporte"?: string,"id_reporte"?: number,"numero_reporte"?: string | null,"proyecto_id"?: number | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "reportes_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "reportes_equipo_id_fkey"
      columns: ["equipo_id"]
isOneToOne: false
      referencedRelation: "equipos"
      referencedColumns: ["id_equipo"]
    },{
      foreignKeyName: "reportes_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "reportes_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    }
                  ]
                },"roles": {
                  Row: {
                    "creado_en": string,"descripcion": string | null,"id_rol": number,"nombre_rol": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"descripcion"?: string | null,"id_rol"?: number,"nombre_rol": string
                  }
                  Update: {
                    "creado_en"?: string,"descripcion"?: string | null,"id_rol"?: number,"nombre_rol"?: string
                  }
                  Relationships: [
                    
                  ]
                },"servicios": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"descripcion": string | null,"empresa_id": number,"id_servicio": number,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"descripcion"?: string | null,"empresa_id": number,"id_servicio"?: number,"tipo": string
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"descripcion"?: string | null,"empresa_id"?: number,"id_servicio"?: number,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "servicios_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    }
                  ]
                },"usuarios": {
                  Row: {
                    "activo": boolean,"actualizado_en": string,"creado_en": string,"empleado_id": number | null,"id_usuario": string,"rol_id": number,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"actualizado_en"?: string,"creado_en"?: string,"empleado_id"?: number | null,"id_usuario": string,"rol_id": number,"username": string
                  }
                  Update: {
                    "activo"?: boolean,"actualizado_en"?: string,"creado_en"?: string,"empleado_id"?: number | null,"id_usuario"?: string,"rol_id"?: number,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "usuarios_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: true
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "usuarios_rol_id_fkey"
      columns: ["rol_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id_rol"]
    }
                  ]
                }
          }
          Views: {
            "v_checklist_detalle": {
                  Row: {
                    "actualizado_en": string | null,"cantidad_cargada": number | null,"cantidad_requerida": number | null,"checklist_id": number | null,"empleado_id": number | null,"id_checklist_detalle": number | null,"marcado": boolean | null,"material_id": number | null,"nombre_material": string | null,"observaciones": string | null,"proyecto_id": number | null,"unidad": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "checklist_detalle_checklist_id_fkey"
      columns: ["checklist_id"]
isOneToOne: false
      referencedRelation: "checklists"
      referencedColumns: ["id_checklist"]
    },{
      foreignKeyName: "checklist_detalle_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "checklist_detalle_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiales"
      referencedColumns: ["id_material"]
    },{
      foreignKeyName: "checklists_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "checklists_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    }
                  ]
                },"v_proyectos": {
                  Row: {
                    "actualizado_en": string | null,"cliente": Json | null,"cliente_id": number | null,"creado_en": string | null,"creado_por": string | null,"empresa_id": number | null,"equipo": Json | null,"equipo_id": number | null,"estado": string | null,"fecha_fin": string | null,"fecha_inicio": string | null,"id_proyecto": number | null,"imagen_url": string | null,"nombre_proyecto": string | null,"progreso": number | null,"servicio": Json | null,"servicio_id": number | null,"ubicacion": string | null,"version": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "proyectos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id_cliente"]
    },{
      foreignKeyName: "proyectos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id_usuario"]
    },{
      foreignKeyName: "proyectos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    },{
      foreignKeyName: "proyectos_equipo_id_fkey"
      columns: ["equipo_id"]
isOneToOne: false
      referencedRelation: "equipos"
      referencedColumns: ["id_equipo"]
    },{
      foreignKeyName: "proyectos_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id_servicio"]
    }
                  ]
                }
          }
          Functions: {
            "_idempotente_guardar":
{ Args: { "p_operation_id": string,"p_resultado": Json,"p_tipo": string }; Returns: undefined
                           },
"_idempotente_leer":
{ Args: { "p_operation_id": string }; Returns: Json
                           },
"_otorgar_puntos":
{ Args: { "p_cantidad": number,"p_empleado_id": number,"p_motivo": string,"p_proyecto_id": number,"p_tipo_evento": string }; Returns: undefined
                           },
"aprobar_reporte":
{ Args: { "p_operation_id"?: string,"p_reporte_id": number }; Returns: Json
                           },
"avanzar_estado":
{ Args: { "p_nuevo_estado": string,"p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"calcular_progreso":
{ Args: { "p_proyecto_id": number }; Returns: number
                           },
"enviar_reporte":
{ Args: { "p_comentarios"?: string,"p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_miembro_equipo":
{ Args: { "p_equipo_id": number }; Returns: boolean
                           },
"es_miembro_proyecto":
{ Args: { "p_proyecto_id": number }; Returns: boolean
                           },
"finalizar_proyecto":
{ Args: { "p_comentarios"?: string,"p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"generar_checklist":
{ Args: { "p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"iniciar_proyecto":
{ Args: { "p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"mi_empleado_id":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"mi_empresa_id":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"rechazar_reporte":
{ Args: { "p_motivo"?: string,"p_operation_id"?: string,"p_reporte_id": number }; Returns: Json
                           },
"registrar_evidencia":
{ Args: { "p_avance_id"?: number,"p_content_type"?: string,"p_descripcion"?: string,"p_object_key": string,"p_operation_id"?: string,"p_proyecto_id": number,"p_size_bytes"?: number,"p_tipo"?: string }; Returns: Json
                           },
"reportar_avance":
{ Args: { "p_descripcion": string,"p_operation_id"?: string,"p_porcentaje"?: number,"p_proyecto_id": number }; Returns: Json
                           },
"validar_checklist":
{ Args: { "p_checklist_id": number,"p_operation_id"?: string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
