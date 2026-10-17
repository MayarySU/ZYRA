
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
                    "actualizado_en": string,"cliente_id": number | null,"creado_en": string,"creado_por": string | null,"empresa_id": number,"equipo_id": number | null,"estado": string,"fecha_fin": string | null,"fecha_inicio": string | null,"id_proyecto": number,"imagen_url": string | null,"nombre_proyecto": string,"requiere_ingenieria": boolean,"requiere_previabilidad": boolean,"requiere_viabilidad": boolean | null,"servicio_id": number | null,"ubicacion": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"cliente_id"?: number | null,"creado_en"?: string,"creado_por"?: string | null,"empresa_id": number,"equipo_id"?: number | null,"estado"?: string,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id_proyecto"?: number,"imagen_url"?: string | null,"nombre_proyecto": string,"requiere_ingenieria"?: boolean,"requiere_previabilidad"?: boolean,"requiere_viabilidad"?: never,"servicio_id"?: number | null,"ubicacion"?: string | null,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"cliente_id"?: number | null,"creado_en"?: string,"creado_por"?: string | null,"empresa_id"?: number,"equipo_id"?: number | null,"estado"?: string,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id_proyecto"?: number,"imagen_url"?: string | null,"nombre_proyecto"?: string,"requiere_ingenieria"?: boolean,"requiere_previabilidad"?: boolean,"requiere_viabilidad"?: never,"servicio_id"?: number | null,"ubicacion"?: string | null,"version"?: number
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
                },"viabilidad_acciones": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"descripcion": string,"estado": string,"id_accion_viabilidad": number,"obligatoria": boolean,"observaciones": string | null,"origen_respuesta_id": number | null,"responsable_empleado_id": number | null,"revision_id": number,"validada_en": string | null,"validada_por": number | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"descripcion": string,"estado"?: string,"id_accion_viabilidad"?: number,"obligatoria"?: boolean,"observaciones"?: string | null,"origen_respuesta_id"?: number | null,"responsable_empleado_id"?: number | null,"revision_id": number,"validada_en"?: string | null,"validada_por"?: number | null,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"descripcion"?: string,"estado"?: string,"id_accion_viabilidad"?: number,"obligatoria"?: boolean,"observaciones"?: string | null,"origen_respuesta_id"?: number | null,"responsable_empleado_id"?: number | null,"revision_id"?: number,"validada_en"?: string | null,"validada_por"?: number | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_acciones_origen_respuesta_id_fkey"
      columns: ["origen_respuesta_id"]
isOneToOne: false
      referencedRelation: "viabilidad_respuestas"
      referencedColumns: ["id_respuesta_viabilidad"]
    },{
      foreignKeyName: "viabilidad_acciones_responsable_empleado_id_fkey"
      columns: ["responsable_empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_acciones_revision_id_fkey"
      columns: ["revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_revisiones"
      referencedColumns: ["id_revision_viabilidad"]
    },{
      foreignKeyName: "viabilidad_acciones_validada_por_fkey"
      columns: ["validada_por"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    }
                  ]
                },"viabilidad_condiciones": {
                  Row: {
                    "accion": string,"id_condicion_viabilidad": number,"operador": string,"pregunta_id": number,"pregunta_origen_id": number,"valor": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion"?: string,"id_condicion_viabilidad"?: number,"operador": string,"pregunta_id": number,"pregunta_origen_id": number,"valor"?: string | null
                  }
                  Update: {
                    "accion"?: string,"id_condicion_viabilidad"?: number,"operador"?: string,"pregunta_id"?: number,"pregunta_origen_id"?: number,"valor"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_condiciones_pregunta_id_fkey"
      columns: ["pregunta_id"]
isOneToOne: false
      referencedRelation: "viabilidad_preguntas"
      referencedColumns: ["id_pregunta_viabilidad"]
    },{
      foreignKeyName: "viabilidad_condiciones_pregunta_origen_id_fkey"
      columns: ["pregunta_origen_id"]
isOneToOne: false
      referencedRelation: "viabilidad_preguntas"
      referencedColumns: ["id_pregunta_viabilidad"]
    }
                  ]
                },"viabilidad_config_servicio": {
                  Row: {
                    "activo_desde": string | null,"actualizado_en": string,"requiere_ingenieria": boolean,"requiere_previabilidad": boolean,"servicio_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo_desde"?: string | null,"actualizado_en"?: string,"requiere_ingenieria"?: boolean,"requiere_previabilidad"?: boolean,"servicio_id": number
                  }
                  Update: {
                    "activo_desde"?: string | null,"actualizado_en"?: string,"requiere_ingenieria"?: boolean,"requiere_previabilidad"?: boolean,"servicio_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_config_servicio_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: true
      referencedRelation: "servicios"
      referencedColumns: ["id_servicio"]
    }
                  ]
                },"viabilidad_evidencias": {
                  Row: {
                    "accion_id": number | null,"creado_en": string,"evidencia_id": string,"id_viabilidad_evidencia": number,"respuesta_id": number | null,"revision_id": number,"validacion_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion_id"?: number | null,"creado_en"?: string,"evidencia_id": string,"id_viabilidad_evidencia"?: number,"respuesta_id"?: number | null,"revision_id": number,"validacion_id"?: number | null
                  }
                  Update: {
                    "accion_id"?: number | null,"creado_en"?: string,"evidencia_id"?: string,"id_viabilidad_evidencia"?: number,"respuesta_id"?: number | null,"revision_id"?: number,"validacion_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_vve_accion"
      columns: ["accion_id","revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_acciones"
      referencedColumns: ["id_accion_viabilidad","revision_id"]
    },{
      foreignKeyName: "fk_vve_respuesta"
      columns: ["respuesta_id","revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_respuestas"
      referencedColumns: ["id_respuesta_viabilidad","revision_id"]
    },{
      foreignKeyName: "fk_vve_validacion"
      columns: ["validacion_id","revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_validaciones"
      referencedColumns: ["id_validacion_viabilidad","revision_id"]
    },{
      foreignKeyName: "viabilidad_evidencias_evidencia_id_fkey"
      columns: ["evidencia_id"]
isOneToOne: false
      referencedRelation: "evidencias"
      referencedColumns: ["id_evidencia"]
    },{
      foreignKeyName: "viabilidad_evidencias_revision_id_fkey"
      columns: ["revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_revisiones"
      referencedColumns: ["id_revision_viabilidad"]
    }
                  ]
                },"viabilidad_opciones": {
                  Row: {
                    "etiqueta": string,"id_opcion_viabilidad": number,"orden": number,"pregunta_id": number,"regla": Json | null,"valor": string
                  }
                  ComputedFields: never
                  Insert: {
                    "etiqueta": string,"id_opcion_viabilidad"?: number,"orden"?: number,"pregunta_id": number,"regla"?: Json | null,"valor": string
                  }
                  Update: {
                    "etiqueta"?: string,"id_opcion_viabilidad"?: number,"orden"?: number,"pregunta_id"?: number,"regla"?: Json | null,"valor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_opciones_pregunta_id_fkey"
      columns: ["pregunta_id"]
isOneToOne: false
      referencedRelation: "viabilidad_preguntas"
      referencedColumns: ["id_pregunta_viabilidad"]
    }
                  ]
                },"viabilidad_plantillas": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"creado_por": string | null,"empresa_id": number,"estado": string,"id_plantilla_viabilidad": number,"nombre": string,"servicio_id": number | null,"tipo_etapa": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"empresa_id": number,"estado"?: string,"id_plantilla_viabilidad"?: number,"nombre": string,"servicio_id"?: number | null,"tipo_etapa": string,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"empresa_id"?: number,"estado"?: string,"id_plantilla_viabilidad"?: number,"nombre"?: string,"servicio_id"?: number | null,"tipo_etapa"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_plantillas_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id_usuario"]
    },{
      foreignKeyName: "viabilidad_plantillas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id_empresa"]
    },{
      foreignKeyName: "viabilidad_plantillas_servicio_id_fkey"
      columns: ["servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["id_servicio"]
    }
                  ]
                },"viabilidad_preguntas": {
                  Row: {
                    "activa": boolean,"ayuda": string | null,"codigo": string,"creado_en": string,"evidencia_instruccion": string | null,"evidencia_obligatoria": boolean,"evidencia_obligatoria_condicion": Json | null,"evidencia_tipo": string | null,"id_pregunta_viabilidad": number,"obligatoria": boolean,"orden": number,"regla_evaluacion": Json | null,"seccion_id": number,"texto": string,"tipo_respuesta": string,"unidad": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"ayuda"?: string | null,"codigo": string,"creado_en"?: string,"evidencia_instruccion"?: string | null,"evidencia_obligatoria"?: boolean,"evidencia_obligatoria_condicion"?: Json | null,"evidencia_tipo"?: string | null,"id_pregunta_viabilidad"?: number,"obligatoria"?: boolean,"orden"?: number,"regla_evaluacion"?: Json | null,"seccion_id": number,"texto": string,"tipo_respuesta": string,"unidad"?: string | null
                  }
                  Update: {
                    "activa"?: boolean,"ayuda"?: string | null,"codigo"?: string,"creado_en"?: string,"evidencia_instruccion"?: string | null,"evidencia_obligatoria"?: boolean,"evidencia_obligatoria_condicion"?: Json | null,"evidencia_tipo"?: string | null,"id_pregunta_viabilidad"?: number,"obligatoria"?: boolean,"orden"?: number,"regla_evaluacion"?: Json | null,"seccion_id"?: number,"texto"?: string,"tipo_respuesta"?: string,"unidad"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_preguntas_seccion_id_fkey"
      columns: ["seccion_id"]
isOneToOne: false
      referencedRelation: "viabilidad_secciones"
      referencedColumns: ["id_seccion_viabilidad"]
    }
                  ]
                },"viabilidad_reglas": {
                  Row: {
                    "accion_o_tipo": string | null,"codigo": string,"creado_en": string,"cuando": NonNullable<Json>,"efecto_funcional": string,"etiqueta": string | null,"id_regla_viabilidad": number,"mensaje": string | null,"orden": number,"plantilla_id": number,"severidad_funcional": string,"validacion_tipo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion_o_tipo"?: string | null,"codigo": string,"creado_en"?: string,"cuando": NonNullable<Json>,"efecto_funcional": string,"etiqueta"?: string | null,"id_regla_viabilidad"?: number,"mensaje"?: string | null,"orden"?: number,"plantilla_id": number,"severidad_funcional": string,"validacion_tipo"?: string | null
                  }
                  Update: {
                    "accion_o_tipo"?: string | null,"codigo"?: string,"creado_en"?: string,"cuando"?: NonNullable<Json>,"efecto_funcional"?: string,"etiqueta"?: string | null,"id_regla_viabilidad"?: number,"mensaje"?: string | null,"orden"?: number,"plantilla_id"?: number,"severidad_funcional"?: string,"validacion_tipo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_reglas_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "viabilidad_plantillas"
      referencedColumns: ["id_plantilla_viabilidad"]
    }
                  ]
                },"viabilidad_respuestas": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"empleado_id": number | null,"id_respuesta_viabilidad": number,"operation_id": string | null,"pregunta_id": number,"revision_id": number,"valor": Json | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"empleado_id"?: number | null,"id_respuesta_viabilidad"?: number,"operation_id"?: string | null,"pregunta_id": number,"revision_id": number,"valor"?: Json | null,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"empleado_id"?: number | null,"id_respuesta_viabilidad"?: number,"operation_id"?: string | null,"pregunta_id"?: number,"revision_id"?: number,"valor"?: Json | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_respuestas_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_respuestas_pregunta_id_fkey"
      columns: ["pregunta_id"]
isOneToOne: false
      referencedRelation: "viabilidad_preguntas"
      referencedColumns: ["id_pregunta_viabilidad"]
    },{
      foreignKeyName: "viabilidad_respuestas_revision_id_fkey"
      columns: ["revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_revisiones"
      referencedColumns: ["id_revision_viabilidad"]
    }
                  ]
                },"viabilidad_revisiones": {
                  Row: {
                    "actualizado_en": string,"asignado_empleado_id": number | null,"creada_por": string | null,"creado_en": string,"estado": string,"evaluada_en": string | null,"evaluada_por": number | null,"finalizada_en": string | null,"finalizada_por": number | null,"id_revision_viabilidad": number,"numero_revision": number,"plantilla_id": number,"proyecto_id": number,"reemplaza_revision_id": number | null,"resultado_calculado": Json | null,"resultado_evaluacion": string | null,"resultado_final": string | null,"tipo_etapa": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"asignado_empleado_id"?: number | null,"creada_por"?: string | null,"creado_en"?: string,"estado"?: string,"evaluada_en"?: string | null,"evaluada_por"?: number | null,"finalizada_en"?: string | null,"finalizada_por"?: number | null,"id_revision_viabilidad"?: number,"numero_revision"?: number,"plantilla_id": number,"proyecto_id": number,"reemplaza_revision_id"?: number | null,"resultado_calculado"?: Json | null,"resultado_evaluacion"?: string | null,"resultado_final"?: string | null,"tipo_etapa": string,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"asignado_empleado_id"?: number | null,"creada_por"?: string | null,"creado_en"?: string,"estado"?: string,"evaluada_en"?: string | null,"evaluada_por"?: number | null,"finalizada_en"?: string | null,"finalizada_por"?: number | null,"id_revision_viabilidad"?: number,"numero_revision"?: number,"plantilla_id"?: number,"proyecto_id"?: number,"reemplaza_revision_id"?: number | null,"resultado_calculado"?: Json | null,"resultado_evaluacion"?: string | null,"resultado_final"?: string | null,"tipo_etapa"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_revisiones_asignado_empleado_id_fkey"
      columns: ["asignado_empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_revisiones_creada_por_fkey"
      columns: ["creada_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id_usuario"]
    },{
      foreignKeyName: "viabilidad_revisiones_evaluada_por_fkey"
      columns: ["evaluada_por"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_revisiones_finalizada_por_fkey"
      columns: ["finalizada_por"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_revisiones_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "viabilidad_plantillas"
      referencedColumns: ["id_plantilla_viabilidad"]
    },{
      foreignKeyName: "viabilidad_revisiones_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "viabilidad_revisiones_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "v_proyectos"
      referencedColumns: ["id_proyecto"]
    },{
      foreignKeyName: "viabilidad_revisiones_reemplaza_revision_id_fkey"
      columns: ["reemplaza_revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_revisiones"
      referencedColumns: ["id_revision_viabilidad"]
    }
                  ]
                },"viabilidad_secciones": {
                  Row: {
                    "codigo": string | null,"creado_en": string,"descripcion": string | null,"id_seccion_viabilidad": number,"orden": number,"plantilla_id": number,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo"?: string | null,"creado_en"?: string,"descripcion"?: string | null,"id_seccion_viabilidad"?: number,"orden"?: number,"plantilla_id": number,"titulo": string
                  }
                  Update: {
                    "codigo"?: string | null,"creado_en"?: string,"descripcion"?: string | null,"id_seccion_viabilidad"?: number,"orden"?: number,"plantilla_id"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_secciones_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "viabilidad_plantillas"
      referencedColumns: ["id_plantilla_viabilidad"]
    }
                  ]
                },"viabilidad_validaciones": {
                  Row: {
                    "actualizado_en": string,"creada_por": number | null,"creado_en": string,"especialista_empleado_id": number | null,"estado": string,"id_validacion_viabilidad": number,"observaciones": string | null,"resuelta_en": string | null,"revision_id": number,"tipo": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creada_por"?: number | null,"creado_en"?: string,"especialista_empleado_id"?: number | null,"estado"?: string,"id_validacion_viabilidad"?: number,"observaciones"?: string | null,"resuelta_en"?: string | null,"revision_id": number,"tipo": string,"version"?: number
                  }
                  Update: {
                    "actualizado_en"?: string,"creada_por"?: number | null,"creado_en"?: string,"especialista_empleado_id"?: number | null,"estado"?: string,"id_validacion_viabilidad"?: number,"observaciones"?: string | null,"resuelta_en"?: string | null,"revision_id"?: number,"tipo"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "viabilidad_validaciones_creada_por_fkey"
      columns: ["creada_por"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_validaciones_especialista_empleado_id_fkey"
      columns: ["especialista_empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id_empleado"]
    },{
      foreignKeyName: "viabilidad_validaciones_revision_id_fkey"
      columns: ["revision_id"]
isOneToOne: false
      referencedRelation: "viabilidad_revisiones"
      referencedColumns: ["id_revision_viabilidad"]
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
                    "actualizado_en": string | null,"cliente": Json | null,"cliente_id": number | null,"creado_en": string | null,"creado_por": string | null,"empresa_id": number | null,"equipo": Json | null,"equipo_id": number | null,"estado": string | null,"fecha_fin": string | null,"fecha_inicio": string | null,"id_proyecto": number | null,"imagen_url": string | null,"nombre_proyecto": string | null,"progreso": number | null,"requiere_ingenieria": boolean | null,"requiere_previabilidad": boolean | null,"requiere_viabilidad": boolean | null,"servicio": Json | null,"servicio_id": number | null,"ubicacion": string | null,"version": number | null
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
            "_exigir_viabilidad":
{ Args: { "p_proyecto_id": number }; Returns: undefined
                           },
"_idempotente_guardar":
{ Args: { "p_operation_id": string,"p_resultado": Json,"p_tipo": string }; Returns: undefined
                           },
"_idempotente_leer":
{ Args: { "p_operation_id": string }; Returns: Json
                           },
"_otorgar_puntos":
{ Args: { "p_cantidad": number,"p_empleado_id": number,"p_motivo": string,"p_proyecto_id": number,"p_tipo_evento": string }; Returns: undefined
                           },
"_viabilidad_bypass_plantilla":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"_viabilidad_condicion_cumple":
{ Args: { "p_operador": string,"p_texto": string,"p_valor": Json }; Returns: boolean
                           },
"_viabilidad_dependencias_ciclicas":
{ Args: { "p_plantilla_id": number }; Returns: boolean
                           },
"_viabilidad_evidencia_obligatoria":
{ Args: { "p_pregunta_id": number,"p_revision_id": number }; Returns: boolean
                           },
"_viabilidad_exigir_previabilidad":
{ Args: { "p_proyecto_id": number }; Returns: undefined
                           },
"_viabilidad_expr_cumple":
{ Args: { "p_expr": Json,"p_revision_id": number }; Returns: boolean
                           },
"_viabilidad_expr_error":
{ Args: { "p_codigos": (string)[],"p_expr": Json }; Returns: string
                           },
"_viabilidad_intentar_cerrar":
{ Args: { "p_revision_id": number }; Returns: string
                           },
"_viabilidad_plantilla_activa":
{ Args: { "p_empresa_id": number,"p_servicio_id": number,"p_tipo_etapa": string }; Returns: number
                           },
"_viabilidad_pregunta_requerida":
{ Args: { "p_obligatoria": boolean,"p_pregunta_id": number,"p_revision_id": number }; Returns: boolean
                           },
"_viabilidad_pregunta_visible":
{ Args: { "p_pregunta_id": number,"p_revision_id": number }; Returns: boolean
                           },
"_viabilidad_regla_error":
{ Args: { "p_regla": Json }; Returns: string
                           },
"_viabilidad_respuesta_activa":
{ Args: { "p_tipo": string,"p_valor": Json }; Returns: boolean
                           },
"_viabilidad_resultado":
{ Args: { "p_senales": Json }; Returns: string
                           },
"_viabilidad_senales":
{ Args: { "p_revision_id": number }; Returns: Json
                           },
"_viabilidad_validar_evidencias":
{ Args: { "p_revision_id": number }; Returns: undefined
                           },
"_viabilidad_validar_obligatorias":
{ Args: { "p_revision_id": number }; Returns: undefined
                           },
"anular_revision_viabilidad":
{ Args: { "p_motivo"?: string,"p_operation_id"?: string,"p_revision_id": number }; Returns: Json
                           },
"aprobar_reporte":
{ Args: { "p_operation_id"?: string,"p_reporte_id": number }; Returns: Json
                           },
"archivar_plantilla_viabilidad":
{ Args: { "p_operation_id"?: string,"p_plantilla_id": number }; Returns: Json
                           },
"avanzar_estado":
{ Args: { "p_nuevo_estado": string,"p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"calcular_progreso":
{ Args: { "p_proyecto_id": number }; Returns: number
                           },
"crear_plantilla_viabilidad":
{ Args: { "p_empresa_id": number,"p_nombre": string,"p_operation_id"?: string,"p_servicio_id": number,"p_tipo_etapa": string }; Returns: Json
                           },
"crear_revision_viabilidad":
{ Args: { "p_asignado_empleado_id"?: number,"p_operation_id"?: string,"p_proyecto_id": number,"p_tipo_etapa": string }; Returns: Json
                           },
"crear_version_plantilla_viabilidad":
{ Args: { "p_operation_id"?: string,"p_origen_id": number }; Returns: Json
                           },
"entregar_revision_viabilidad":
{ Args: { "p_operation_id"?: string,"p_revision_id": number }; Returns: Json
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
"es_participante_viabilidad":
{ Args: { "p_revision_id": number }; Returns: boolean
                           },
"es_validador_asignado":
{ Args: { "p_validacion_id": number }; Returns: boolean
                           },
"establecer_aplicabilidad_viabilidad":
{ Args: { "p_operation_id"?: string,"p_proyecto_id": number,"p_requiere_ingenieria": boolean,"p_requiere_previabilidad": boolean }; Returns: Json
                           },
"evaluar_viabilidad":
{ Args: { "p_revision_id": number }; Returns: Json
                           },
"finalizar_proyecto":
{ Args: { "p_comentarios"?: string,"p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"generar_checklist":
{ Args: { "p_operation_id"?: string,"p_proyecto_id": number }; Returns: Json
                           },
"guardar_respuesta_viabilidad":
{ Args: { "p_operation_id"?: string,"p_pregunta_id": number,"p_revision_id": number,"p_valor": Json,"p_version"?: number }; Returns: Json
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
"publicar_plantilla_viabilidad":
{ Args: { "p_operation_id"?: string,"p_plantilla_id": number }; Returns: Json
                           },
"rechazar_reporte":
{ Args: { "p_motivo"?: string,"p_operation_id"?: string,"p_reporte_id": number }; Returns: Json
                           },
"registrar_evidencia":
{ Args: { "p_avance_id"?: number,"p_content_type"?: string,"p_descripcion"?: string,"p_object_key": string,"p_operation_id"?: string,"p_proyecto_id": number,"p_size_bytes"?: number,"p_tipo"?: string }; Returns: Json
                           },
"registrar_evidencia_viabilidad":
{ Args: { "p_accion_id"?: number,"p_content_type"?: string,"p_descripcion"?: string,"p_object_key": string,"p_operation_id"?: string,"p_pregunta_id"?: number,"p_revision_id": number,"p_size_bytes"?: number,"p_tipo"?: string,"p_validacion_id"?: number }; Returns: Json
                           },
"reportar_avance":
{ Args: { "p_descripcion": string,"p_operation_id"?: string,"p_porcentaje"?: number,"p_proyecto_id": number }; Returns: Json
                           },
"resolver_accion_viabilidad":
{ Args: { "p_accion_id": number,"p_estado": string,"p_observaciones"?: string,"p_operation_id"?: string }; Returns: Json
                           },
"resolver_validacion_viabilidad":
{ Args: { "p_estado": string,"p_observaciones"?: string,"p_operation_id"?: string,"p_validacion_id": number }; Returns: Json
                           },
"sembrar_cuestionario_viabilidad_definitivo":
{ Args: { "p_empresa_nombre"?: string }; Returns: Json
                           },
"validar_checklist":
{ Args: { "p_checklist_id": number,"p_operation_id"?: string }; Returns: Json
                           },
"validar_plantilla_viabilidad":
{ Args: { "p_plantilla_id": number }; Returns: Json
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
