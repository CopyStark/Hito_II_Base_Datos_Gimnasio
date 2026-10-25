/* =====================================================================================
   GimnasioDB - DDL (estructura de la base de datos)
   Convención de nombres: cada atributo termina con el nombre de su tabla
   (nombre_sede, id_socio_contrato, cupo_maximo_sesion). Las PK conservan id_<tabla>.

   CÓMO EJECUTAR (en SSMS, conectado a TU instancia de SQL Server):
     1. Ejecuta ESTE archivo completo (crea la base GimnasioDB si no existe, y sus objetos).
     2. Ejecuta después GimnasioDB_Seed.sql (datos de prueba).

   IMPORTANTE:
     - Este script NO borra nada. Si ya existe una GimnasioDB con el esquema antiguo,
       elimínala antes (esto BORRA sus datos):
           USE master;
           ALTER DATABASE GimnasioDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
           DROP DATABASE GimnasioDB;
     - Se eliminaron las rutas de archivos fijas (C:\Program Files\...) y las opciones
       de SQL Server 2022 del CREATE DATABASE, para que funcione en cualquier instancia
       (Developer, Express, etc.) y versión.
   ===================================================================================== */
USE [master]
GO
IF DB_ID(N'GimnasioDB') IS NULL
    CREATE DATABASE [GimnasioDB]
GO
USE [GimnasioDB]
GO
/****** Objeto: Table [dbo].[Region] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Region](
	[id_region] [int] IDENTITY(1,1) NOT NULL,
	[nombre_region] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Region] PRIMARY KEY CLUSTERED 
(
	[id_region] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Provincia] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Provincia](
	[id_provincia] [int] IDENTITY(1,1) NOT NULL,
	[id_region_provincia] [int] NOT NULL,
	[nombre_provincia] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Provincia] PRIMARY KEY CLUSTERED 
(
	[id_provincia] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Comuna] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Comuna](
	[id_comuna] [int] IDENTITY(1,1) NOT NULL,
	[id_provincia_comuna] [int] NOT NULL,
	[nombre_comuna] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Comuna] PRIMARY KEY CLUSTERED 
(
	[id_comuna] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Ciudad] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Ciudad](
	[id_ciudad] [int] IDENTITY(1,1) NOT NULL,
	[id_comuna_ciudad] [int] NOT NULL,
	[nombre_ciudad] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Ciudad] PRIMARY KEY CLUSTERED 
(
	[id_ciudad] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Sede] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sede](
	[id_sede] [int] IDENTITY(1,1) NOT NULL,
	[nombre_sede] [nvarchar](100) NOT NULL,
	[direccion_calle_sede] [nvarchar](200) NOT NULL,
	[id_ciudad_sede] [int] NOT NULL,
	[telefono_sede] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Sede] PRIMARY KEY CLUSTERED 
(
	[id_sede] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[PlanMembresia] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PlanMembresia](
	[id_planmembresia] [int] IDENTITY(1,1) NOT NULL,
	[nombre_planmembresia] [nvarchar](100) NOT NULL,
	[duracion_meses_planmembresia] [int] NOT NULL,
	[precio_vigente_planmembresia] [decimal](12,2) NOT NULL,
 CONSTRAINT [PK_PlanMembresia] PRIMARY KEY CLUSTERED 
(
	[id_planmembresia] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Socio] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Socio](
	[id_socio] [int] IDENTITY(1,1) NOT NULL,
	[rut_socio] [varchar](12) NOT NULL,
	[nombre_completo_socio] [nvarchar](150) NOT NULL,
	[fecha_nacimiento_socio] [date] NOT NULL,
	[correo_socio] [varchar](100) NOT NULL,
	[telefono_socio] [varchar](20) NOT NULL,
	[id_sede_registro_socio] [int] NOT NULL,
	[acepta_promociones_socio] [bit] NOT NULL,
	[activo_socio] [bit] NOT NULL,
 CONSTRAINT [PK_Socio] PRIMARY KEY CLUSTERED 
(
	[id_socio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo_socio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[rut_socio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Contrato] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Contrato](
	[id_contrato] [int] IDENTITY(1,1) NOT NULL,
	[id_socio_contrato] [int] NOT NULL,
	[id_planmembresia_contrato] [int] NOT NULL,
	[fecha_inicio_contrato] [date] NOT NULL,
	[fecha_termino_contrato] [date] NOT NULL,
	[estado_contrato] [varchar](20) NOT NULL,
	[precio_pactado_contrato] [decimal](12,2) NOT NULL,
 CONSTRAINT [PK_Contrato] PRIMARY KEY CLUSTERED 
(
	[id_contrato] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Clase] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Clase](
	[id_clase] [int] IDENTITY(1,1) NOT NULL,
	[nombre_clase] [nvarchar](100) NOT NULL,
	[duracion_minutos_clase] [int] NOT NULL,
	[nivel_exigencia_clase] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Clase] PRIMARY KEY CLUSTERED 
(
	[id_clase] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Instructor] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Instructor](
	[id_instructor] [int] IDENTITY(1,1) NOT NULL,
	[rut_instructor] [varchar](12) NOT NULL,
	[nombre_completo_instructor] [nvarchar](150) NOT NULL,
	[correo_instructor] [varchar](100) NOT NULL,
	[telefono_instructor] [varchar](20) NOT NULL,
	[id_sede_habitual_instructor] [int] NOT NULL,
 CONSTRAINT [PK_Instructor] PRIMARY KEY CLUSTERED 
(
	[id_instructor] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo_instructor] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[rut_instructor] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Sesion] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sesion](
	[id_sesion] [int] IDENTITY(1,1) NOT NULL,
	[id_clase_sesion] [int] NOT NULL,
	[id_sede_sesion] [int] NOT NULL,
	[id_instructor_sesion] [int] NULL,
	[fecha_sesion] [date] NOT NULL,
	[hora_sesion] [time](7) NOT NULL,
	[cupo_maximo_sesion] [int] NOT NULL,
 CONSTRAINT [PK_Sesion] PRIMARY KEY CLUSTERED 
(
	[id_sesion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Inscripcion] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Inscripcion](
	[id_inscripcion] [int] IDENTITY(1,1) NOT NULL,
	[id_socio_inscripcion] [int] NOT NULL,
	[id_sesion_inscripcion] [int] NOT NULL,
	[fecha_inscripcion] [datetime2](7) NOT NULL,
	[asistio_inscripcion] [bit] NULL,
	[observaciones_inscripcion] [nvarchar](500) NULL,
	[estado_inscripcion] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Inscripcion] PRIMARY KEY CLUSTERED 
(
	[id_inscripcion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Pago] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Pago](
	[id_pago] [int] IDENTITY(1,1) NOT NULL,
	[id_contrato_pago] [int] NOT NULL,
	[fecha_pago] [datetime2](7) NOT NULL,
	[monto_cancelado_pago] [decimal](12,2) NOT NULL,
	[medio_pago] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Pago] PRIMARY KEY CLUSTERED 
(
	[id_pago] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Equipamiento] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Equipamiento](
	[id_equipamiento] [int] IDENTITY(1,1) NOT NULL,
	[id_sede_equipamiento] [int] NOT NULL,
	[nombre_descriptivo_equipamiento] [nvarchar](150) NOT NULL,
	[fecha_adquisicion_equipamiento] [date] NOT NULL,
 CONSTRAINT [PK_Equipamiento] PRIMARY KEY CLUSTERED 
(
	[id_equipamiento] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Personal] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Personal](
	[id_personal] [int] IDENTITY(1,1) NOT NULL,
	[rut_personal] [varchar](12) NOT NULL,
	[nombre_completo_personal] [nvarchar](150) NOT NULL,
	[correo_personal] [varchar](100) NOT NULL,
	[telefono_personal] [varchar](20) NOT NULL,
	[cargo_personal] [varchar](50) NOT NULL,
	[id_sede_personal] [int] NOT NULL,
 CONSTRAINT [PK_Personal] PRIMARY KEY CLUSTERED 
(
	[id_personal] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo_personal] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[rut_personal] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Rol] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Rol](
	[id_rol] [int] IDENTITY(1,1) NOT NULL,
	[nombre_rol] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_Rol] PRIMARY KEY CLUSTERED 
(
	[id_rol] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[nombre_rol] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Usuario] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Usuario](
	[id_usuario] [int] IDENTITY(1,1) NOT NULL,
	[username_usuario] [varchar](50) NOT NULL,
	[password_hash_usuario] [varbinary](64) NOT NULL,
	[id_rol_usuario] [int] NOT NULL,
	[id_socio_usuario] [int] NULL,
	[id_instructor_usuario] [int] NULL,
	[id_personal_usuario] [int] NULL,
 CONSTRAINT [PK_Usuario] PRIMARY KEY CLUSTERED 
(
	[id_usuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[username_usuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Objeto: Index [IX_Contrato_Socio_Estado] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Contrato_Socio_Estado] ON [dbo].[Contrato]
(
	[id_socio_contrato] ASC,
	[estado_contrato] ASC
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Inscripcion_Sesion] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Inscripcion_Sesion] ON [dbo].[Inscripcion]
(
	[id_sesion_inscripcion] ASC
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [UQ_Socio_Sesion_Activa] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_Socio_Sesion_Activa] ON [dbo].[Inscripcion]
(
	[id_socio_inscripcion] ASC,
	[id_sesion_inscripcion] ASC
)
WHERE ([estado_inscripcion]='Inscrito')
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Pago_Contrato] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Pago_Contrato] ON [dbo].[Pago]
(
	[id_contrato_pago] ASC
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Sesion_Fecha_Hora] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Sesion_Fecha_Hora] ON [dbo].[Sesion]
(
	[fecha_sesion] ASC,
	[hora_sesion] ASC
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Socio_Correo] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Socio_Correo] ON [dbo].[Socio]
(
	[correo_socio] ASC
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Socio_Rut] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Socio_Rut] ON [dbo].[Socio]
(
	[rut_socio] ASC
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Contrato] ADD  CONSTRAINT [DF_Contrato_estado_contrato]  DEFAULT ('Vigente') FOR [estado_contrato]
GO
ALTER TABLE [dbo].[Inscripcion] ADD  CONSTRAINT [DF_Inscripcion_fecha_inscripcion]  DEFAULT (sysdatetime()) FOR [fecha_inscripcion]
GO
ALTER TABLE [dbo].[Inscripcion] ADD  CONSTRAINT [DF_Inscripcion_estado_inscripcion]  DEFAULT ('Inscrito') FOR [estado_inscripcion]
GO
ALTER TABLE [dbo].[Pago] ADD  CONSTRAINT [DF_Pago_fecha_pago]  DEFAULT (sysdatetime()) FOR [fecha_pago]
GO
ALTER TABLE [dbo].[Socio] ADD  CONSTRAINT [DF_Socio_acepta_promociones_socio]  DEFAULT ((0)) FOR [acepta_promociones_socio]
GO
ALTER TABLE [dbo].[Socio] ADD  CONSTRAINT [DF_Socio_activo_socio]  DEFAULT ((1)) FOR [activo_socio]
GO
ALTER TABLE [dbo].[Provincia]  WITH CHECK ADD  CONSTRAINT [FK_Provincia_Region] FOREIGN KEY([id_region_provincia])
REFERENCES [dbo].[Region] ([id_region])
GO
ALTER TABLE [dbo].[Provincia] CHECK CONSTRAINT [FK_Provincia_Region]
GO
ALTER TABLE [dbo].[Comuna]  WITH CHECK ADD  CONSTRAINT [FK_Comuna_Provincia] FOREIGN KEY([id_provincia_comuna])
REFERENCES [dbo].[Provincia] ([id_provincia])
GO
ALTER TABLE [dbo].[Comuna] CHECK CONSTRAINT [FK_Comuna_Provincia]
GO
ALTER TABLE [dbo].[Ciudad]  WITH CHECK ADD  CONSTRAINT [FK_Ciudad_Comuna] FOREIGN KEY([id_comuna_ciudad])
REFERENCES [dbo].[Comuna] ([id_comuna])
GO
ALTER TABLE [dbo].[Ciudad] CHECK CONSTRAINT [FK_Ciudad_Comuna]
GO
ALTER TABLE [dbo].[Sede]  WITH CHECK ADD  CONSTRAINT [FK_Sede_Ciudad1] FOREIGN KEY([id_ciudad_sede])
REFERENCES [dbo].[Ciudad] ([id_ciudad])
GO
ALTER TABLE [dbo].[Sede] CHECK CONSTRAINT [FK_Sede_Ciudad1]
GO
ALTER TABLE [dbo].[Socio]  WITH CHECK ADD  CONSTRAINT [FK_Socio_SedeRegistro] FOREIGN KEY([id_sede_registro_socio])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Socio] CHECK CONSTRAINT [FK_Socio_SedeRegistro]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [FK_Contrato_Plan] FOREIGN KEY([id_planmembresia_contrato])
REFERENCES [dbo].[PlanMembresia] ([id_planmembresia])
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [FK_Contrato_Plan]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [FK_Contrato_Socio] FOREIGN KEY([id_socio_contrato])
REFERENCES [dbo].[Socio] ([id_socio])
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [FK_Contrato_Socio]
GO
ALTER TABLE [dbo].[Equipamiento]  WITH CHECK ADD  CONSTRAINT [FK_Equipamiento_Sede] FOREIGN KEY([id_sede_equipamiento])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Equipamiento] CHECK CONSTRAINT [FK_Equipamiento_Sede]
GO
ALTER TABLE [dbo].[Inscripcion]  WITH CHECK ADD  CONSTRAINT [FK_Inscripcion_Sesion] FOREIGN KEY([id_sesion_inscripcion])
REFERENCES [dbo].[Sesion] ([id_sesion])
GO
ALTER TABLE [dbo].[Inscripcion] CHECK CONSTRAINT [FK_Inscripcion_Sesion]
GO
ALTER TABLE [dbo].[Inscripcion]  WITH CHECK ADD  CONSTRAINT [FK_Inscripcion_Socio] FOREIGN KEY([id_socio_inscripcion])
REFERENCES [dbo].[Socio] ([id_socio])
GO
ALTER TABLE [dbo].[Inscripcion] CHECK CONSTRAINT [FK_Inscripcion_Socio]
GO
ALTER TABLE [dbo].[Instructor]  WITH CHECK ADD  CONSTRAINT [FK_Instructor_Sede] FOREIGN KEY([id_sede_habitual_instructor])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Instructor] CHECK CONSTRAINT [FK_Instructor_Sede]
GO
ALTER TABLE [dbo].[Pago]  WITH CHECK ADD  CONSTRAINT [FK_Pago_Contrato] FOREIGN KEY([id_contrato_pago])
REFERENCES [dbo].[Contrato] ([id_contrato])
GO
ALTER TABLE [dbo].[Pago] CHECK CONSTRAINT [FK_Pago_Contrato]
GO
ALTER TABLE [dbo].[Personal]  WITH CHECK ADD  CONSTRAINT [FK_Personal_Sede] FOREIGN KEY([id_sede_personal])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Personal] CHECK CONSTRAINT [FK_Personal_Sede]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [FK_Sesion_Clase] FOREIGN KEY([id_clase_sesion])
REFERENCES [dbo].[Clase] ([id_clase])
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [FK_Sesion_Clase]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [FK_Sesion_Instructor] FOREIGN KEY([id_instructor_sesion])
REFERENCES [dbo].[Instructor] ([id_instructor])
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [FK_Sesion_Instructor]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [FK_Sesion_Sede] FOREIGN KEY([id_sede_sesion])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [FK_Sesion_Sede]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Instructor] FOREIGN KEY([id_instructor_usuario])
REFERENCES [dbo].[Instructor] ([id_instructor])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Instructor]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Personal] FOREIGN KEY([id_personal_usuario])
REFERENCES [dbo].[Personal] ([id_personal])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Personal]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Rol] FOREIGN KEY([id_rol_usuario])
REFERENCES [dbo].[Rol] ([id_rol])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Rol]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Socio] FOREIGN KEY([id_socio_usuario])
REFERENCES [dbo].[Socio] ([id_socio])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Socio]
GO
ALTER TABLE [dbo].[Clase]  WITH CHECK ADD  CONSTRAINT [CK_Clase_Duracion] CHECK  (([duracion_minutos_clase]>(0)))
GO
ALTER TABLE [dbo].[Clase] CHECK CONSTRAINT [CK_Clase_Duracion]
GO
ALTER TABLE [dbo].[Clase]  WITH CHECK ADD  CONSTRAINT [CK_Clase_Nivel] CHECK  (([nivel_exigencia_clase]='Avanzado' OR [nivel_exigencia_clase]='Intermedio' OR [nivel_exigencia_clase]='Principiante'))
GO
ALTER TABLE [dbo].[Clase] CHECK CONSTRAINT [CK_Clase_Nivel]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [CK_Contrato_Estado] CHECK  (([estado_contrato]='Cancelado' OR [estado_contrato]='Vencido' OR [estado_contrato]='Vigente'))
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [CK_Contrato_Estado]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [CK_Contrato_Fechas] CHECK  (([fecha_termino_contrato]>=[fecha_inicio_contrato]))
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [CK_Contrato_Fechas]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [CK_Contrato_PrecioPactado] CHECK  (([precio_pactado_contrato]>=(0)))
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [CK_Contrato_PrecioPactado]
GO
ALTER TABLE [dbo].[Inscripcion]  WITH CHECK ADD  CONSTRAINT [CK_Inscripcion_Estado] CHECK  (([estado_inscripcion]='Cancelado' OR [estado_inscripcion]='Inscrito'))
GO
ALTER TABLE [dbo].[Inscripcion] CHECK CONSTRAINT [CK_Inscripcion_Estado]
GO
ALTER TABLE [dbo].[Pago]  WITH CHECK ADD  CONSTRAINT [CK_Pago_Medio] CHECK  (([medio_pago]='Transferencia' OR [medio_pago]='Tarjeta' OR [medio_pago]='Efectivo'))
GO
ALTER TABLE [dbo].[Pago] CHECK CONSTRAINT [CK_Pago_Medio]
GO
ALTER TABLE [dbo].[Pago]  WITH CHECK ADD  CONSTRAINT [CK_Pago_Monto] CHECK  (([monto_cancelado_pago]>(0)))
GO
ALTER TABLE [dbo].[Pago] CHECK CONSTRAINT [CK_Pago_Monto]
GO
ALTER TABLE [dbo].[PlanMembresia]  WITH CHECK ADD  CONSTRAINT [CK_Plan_Duracion] CHECK  (([duracion_meses_planmembresia]>(0)))
GO
ALTER TABLE [dbo].[PlanMembresia] CHECK CONSTRAINT [CK_Plan_Duracion]
GO
ALTER TABLE [dbo].[PlanMembresia]  WITH CHECK ADD  CONSTRAINT [CK_Plan_Precio] CHECK  (([precio_vigente_planmembresia]>=(0)))
GO
ALTER TABLE [dbo].[PlanMembresia] CHECK CONSTRAINT [CK_Plan_Precio]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [CK_Sesion_Cupo] CHECK  (([cupo_maximo_sesion]>(0)))
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [CK_Sesion_Cupo]
GO
------------------------------------------------------------
-- 8. VISTAS PARA REPORTES DEL STAFF
-- Sin alias de tabla ni de columna directa: todos los atributos son únicos
-- en la BD. Solo las columnas calculadas (COUNT, SUM, YEAR...) llevan nombre.
------------------------------------------------------------
/****** Objeto: View [dbo].[vw_Reporte_Socios_Por_Sede] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 1: Socios vigentes / vencidos por sede
CREATE   VIEW [dbo].[vw_Reporte_Socios_Por_Sede] AS
SELECT 
    nombre_sede,
    estado_contrato,
    COUNT(DISTINCT id_socio) AS cantidad_socios
FROM Sede
INNER JOIN Socio ON id_sede = id_sede_registro_socio
LEFT JOIN Contrato ON id_socio = id_socio_contrato
GROUP BY nombre_sede, estado_contrato;
GO
/****** Objeto: View [dbo].[vw_Reporte_Ocupacion_Clases] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 2: Ocupación de clases (Inscritos vs Cupo disponible)
CREATE   VIEW [dbo].[vw_Reporte_Ocupacion_Clases] AS
SELECT 
    id_sesion,
    nombre_clase,
    nombre_sede,
    fecha_sesion,
    hora_sesion,
    cupo_maximo_sesion,
    COUNT(id_inscripcion) AS total_inscritos,
    (cupo_maximo_sesion - COUNT(id_inscripcion)) AS cupos_disponibles
FROM Sesion
INNER JOIN Clase ON id_clase_sesion = id_clase
INNER JOIN Sede ON id_sede_sesion = id_sede
LEFT JOIN Inscripcion ON id_sesion = id_sesion_inscripcion AND estado_inscripcion = 'Inscrito'
GROUP BY id_sesion, nombre_clase, nombre_sede, fecha_sesion, hora_sesion, cupo_maximo_sesion;
GO
/****** Objeto: View [dbo].[vw_Reporte_Ingresos_Por_Sede] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 3: Ingresos por período y por sede
CREATE   VIEW [dbo].[vw_Reporte_Ingresos_Por_Sede] AS
SELECT 
    nombre_sede,
    YEAR(fecha_pago) AS anio_pago,
    MONTH(fecha_pago) AS mes_pago,
    SUM(monto_cancelado_pago) AS total_ingresos
FROM Pago
INNER JOIN Contrato ON id_contrato_pago = id_contrato
INNER JOIN Socio ON id_socio_contrato = id_socio
INNER JOIN Sede ON id_sede_registro_socio = id_sede
GROUP BY nombre_sede, YEAR(fecha_pago), MONTH(fecha_pago);
GO
/****** Objeto: View [dbo].[vw_Ranking_Clases_Demandadas] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 4: Ranking de clases más demandadas
CREATE   VIEW [dbo].[vw_Ranking_Clases_Demandadas] AS
SELECT 
    nombre_clase,
    nivel_exigencia_clase,
    COUNT(id_inscripcion) AS total_inscripciones
FROM Clase
INNER JOIN Sesion ON id_clase = id_clase_sesion
INNER JOIN Inscripcion ON id_sesion = id_sesion_inscripcion
WHERE estado_inscripcion = 'Inscrito'
GROUP BY nombre_clase, nivel_exigencia_clase;
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Jerarquía geográfica: Región > Provincia > Comuna > Ciudad (orden administrativo real de Chile; el enunciado la menciona como Región > Comuna > Provincia > Ciudad).' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'Region'
GO
