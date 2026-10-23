USE [master]
GO
/****** Objeto: Database [GimnasioDB] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE DATABASE [GimnasioDB]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'GimnasioDB', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\GimnasioDB.mdf' , SIZE = 8192KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'GimnasioDB_log', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\GimnasioDB_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [GimnasioDB] SET COMPATIBILITY_LEVEL = 160
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [GimnasioDB].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [GimnasioDB] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [GimnasioDB] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [GimnasioDB] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [GimnasioDB] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [GimnasioDB] SET ARITHABORT OFF 
GO
ALTER DATABASE [GimnasioDB] SET AUTO_CLOSE OFF 
GO
ALTER DATABASE [GimnasioDB] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [GimnasioDB] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [GimnasioDB] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [GimnasioDB] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [GimnasioDB] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [GimnasioDB] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [GimnasioDB] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [GimnasioDB] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [GimnasioDB] SET  ENABLE_BROKER 
GO
ALTER DATABASE [GimnasioDB] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [GimnasioDB] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [GimnasioDB] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [GimnasioDB] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [GimnasioDB] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [GimnasioDB] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [GimnasioDB] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [GimnasioDB] SET RECOVERY FULL 
GO
ALTER DATABASE [GimnasioDB] SET  MULTI_USER 
GO
ALTER DATABASE [GimnasioDB] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [GimnasioDB] SET DB_CHAINING OFF 
GO
ALTER DATABASE [GimnasioDB] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [GimnasioDB] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [GimnasioDB] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [GimnasioDB] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
EXEC sys.sp_db_vardecimal_storage_format N'GimnasioDB', N'ON'
GO
ALTER DATABASE [GimnasioDB] SET QUERY_STORE = ON
GO
ALTER DATABASE [GimnasioDB] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
USE [GimnasioDB]
GO
/****** Objeto: Table [dbo].[Sede] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sede](
	[id_sede] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[direccion_calle] [nvarchar](200) NOT NULL,
	[id_ciudad] [int] NOT NULL,
	[telefono] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Sede] PRIMARY KEY CLUSTERED 
(
	[id_sede] ASC
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
	[rut] [varchar](12) NOT NULL,
	[nombre_completo] [nvarchar](150) NOT NULL,
	[fecha_nacimiento] [date] NOT NULL,
	[correo] [varchar](100) NOT NULL,
	[telefono] [varchar](20) NOT NULL,
	[id_sede_registro] [int] NOT NULL,
	[acepta_promociones] [bit] NOT NULL,
	[activo] [bit] NOT NULL,
 CONSTRAINT [PK_Socio] PRIMARY KEY CLUSTERED 
(
	[id_socio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[rut] ASC
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
	[id_socio] [int] NOT NULL,
	[id_plan] [int] NOT NULL,
	[fecha_inicio] [date] NOT NULL,
	[fecha_termino] [date] NOT NULL,
	[estado] [varchar](20) NOT NULL,
	[precio_pactado] [decimal](12, 2) NOT NULL,
 CONSTRAINT [PK_Contrato] PRIMARY KEY CLUSTERED 
(
	[id_contrato] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: View [dbo].[vw_Reporte_Socios_Por_Sede] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

------------------------------------------------------------
-- 8. VISTAS PARA REPORTES DEL STAFF
------------------------------------------------------------

-- Reporte 1: Socios vigentes / vencidos por sede
CREATE   VIEW [dbo].[vw_Reporte_Socios_Por_Sede] AS
SELECT 
    s.nombre AS Sede,
    c.estado AS Estado_Contrato,
    COUNT(DISTINCT so.id_socio) AS Cantidad_Socios
FROM Sede s
INNER JOIN Socio so ON s.id_sede = so.id_sede_registro
LEFT JOIN Contrato c ON so.id_socio = c.id_socio
GROUP BY s.nombre, c.estado;
GO
/****** Objeto: Table [dbo].[Clase] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Clase](
	[id_clase] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[duracion_minutos] [int] NOT NULL,
	[nivel_exigencia] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Clase] PRIMARY KEY CLUSTERED 
(
	[id_clase] ASC
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
	[id_clase] [int] NOT NULL,
	[id_sede] [int] NOT NULL,
	[id_instructor] [int] NULL,
	[fecha] [date] NOT NULL,
	[hora] [time](7) NOT NULL,
	[cupo_maximo] [int] NOT NULL,
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
	[id_socio] [int] NOT NULL,
	[id_sesion] [int] NOT NULL,
	[fecha_inscripcion] [datetime2](7) NOT NULL,
	[asistio] [bit] NULL,
	[observaciones] [nvarchar](500) NULL,
	[estado] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Inscripcion] PRIMARY KEY CLUSTERED 
(
	[id_inscripcion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: View [dbo].[vw_Reporte_Ocupacion_Clases] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 2: Ocupación de clases (Inscritos vs Cupo disponible)
CREATE   VIEW [dbo].[vw_Reporte_Ocupacion_Clases] AS
SELECT 
    se.id_sesion,
    c.nombre AS Clase,
    sd.nombre AS Sede,
    se.fecha,
    se.hora,
    se.cupo_maximo,
    COUNT(i.id_inscripcion) AS Total_Inscritos,
    (se.cupo_maximo - COUNT(i.id_inscripcion)) AS Cupos_Disponibles
FROM Sesion se
INNER JOIN Clase c ON se.id_clase = c.id_clase
INNER JOIN Sede sd ON se.id_sede = sd.id_sede
LEFT JOIN Inscripcion i ON se.id_sesion = i.id_sesion AND i.estado = 'Inscrito'
GROUP BY se.id_sesion, c.nombre, sd.nombre, se.fecha, se.hora, se.cupo_maximo;
GO
/****** Objeto: Table [dbo].[Pago] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Pago](
	[id_pago] [int] IDENTITY(1,1) NOT NULL,
	[id_contrato] [int] NOT NULL,
	[fecha_pago] [datetime2](7) NOT NULL,
	[monto_cancelado] [decimal](12, 2) NOT NULL,
	[medio_pago] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Pago] PRIMARY KEY CLUSTERED 
(
	[id_pago] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: View [dbo].[vw_Reporte_Ingresos_Por_Sede] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 3: Ingresos por período y por sede
CREATE   VIEW [dbo].[vw_Reporte_Ingresos_Por_Sede] AS
SELECT 
    s.nombre AS Sede,
    YEAR(p.fecha_pago) AS Anio,
    MONTH(p.fecha_pago) AS Mes,
    SUM(p.monto_cancelado) AS Total_Ingresos
FROM Pago p
INNER JOIN Contrato c ON p.id_contrato = c.id_contrato
INNER JOIN Socio so ON c.id_socio = so.id_socio
INNER JOIN Sede s ON so.id_sede_registro = s.id_sede
GROUP BY s.nombre, YEAR(p.fecha_pago), MONTH(p.fecha_pago);
GO
/****** Objeto: View [dbo].[vw_Ranking_Clases_Demandadas] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Reporte 4: Ranking de clases más demandadas
CREATE   VIEW [dbo].[vw_Ranking_Clases_Demandadas] AS
SELECT 
    c.nombre AS Clase,
    c.nivel_exigencia,
    COUNT(i.id_inscripcion) AS Total_Inscripciones
FROM Clase c
INNER JOIN Sesion se ON c.id_clase = se.id_clase
INNER JOIN Inscripcion i ON se.id_sesion = i.id_sesion
WHERE i.estado = 'Inscrito'
GROUP BY c.nombre, c.nivel_exigencia;
GO
/****** Objeto: Table [dbo].[Ciudad] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Ciudad](
	[id_ciudad] [int] IDENTITY(1,1) NOT NULL,
	[id_comuna] [int] NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Ciudad] PRIMARY KEY CLUSTERED 
(
	[id_ciudad] ASC
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
	[id_provincia] [int] NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Comuna] PRIMARY KEY CLUSTERED 
(
	[id_comuna] ASC
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
	[id_sede] [int] NOT NULL,
	[nombre_descriptivo] [nvarchar](150) NOT NULL,
	[fecha_adquisicion] [date] NOT NULL,
 CONSTRAINT [PK_Equipamiento] PRIMARY KEY CLUSTERED 
(
	[id_equipamiento] ASC
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
	[rut] [varchar](12) NOT NULL,
	[nombre_completo] [nvarchar](150) NOT NULL,
	[correo] [varchar](100) NOT NULL,
	[telefono] [varchar](20) NOT NULL,
	[id_sede_habitual] [int] NOT NULL,
 CONSTRAINT [PK_Instructor] PRIMARY KEY CLUSTERED 
(
	[id_instructor] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[rut] ASC
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
	[rut] [varchar](12) NOT NULL,
	[nombre_completo] [nvarchar](150) NOT NULL,
	[correo] [varchar](100) NOT NULL,
	[telefono] [varchar](20) NOT NULL,
	[cargo] [varchar](50) NOT NULL,
	[id_sede] [int] NOT NULL,
 CONSTRAINT [PK_Personal] PRIMARY KEY CLUSTERED 
(
	[id_personal] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[rut] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[PlanMembresia] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PlanMembresia](
	[id_plan] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[duracion_meses] [int] NOT NULL,
	[precio_vigente] [decimal](12, 2) NOT NULL,
 CONSTRAINT [PK_PlanMembresia] PRIMARY KEY CLUSTERED 
(
	[id_plan] ASC
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
	[id_region] [int] NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Provincia] PRIMARY KEY CLUSTERED 
(
	[id_provincia] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Region] Fecha de script: 23/10/2026 13:39:39 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Region](
	[id_region] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_Region] PRIMARY KEY CLUSTERED 
(
	[id_region] ASC
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
	[username] [varchar](50) NOT NULL,
	[password_hash] [varbinary](64) NOT NULL,
	[id_rol] [int] NOT NULL,
	[id_socio] [int] NULL,
	[id_instructor] [int] NULL,
	[id_personal] [int] NULL,
 CONSTRAINT [PK_Usuario] PRIMARY KEY CLUSTERED 
(
	[id_usuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Objeto: Index [IX_Contrato_Socio_Estado] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Contrato_Socio_Estado] ON [dbo].[Contrato]
(
	[id_socio] ASC,
	[estado] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Inscripcion_Sesion] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Inscripcion_Sesion] ON [dbo].[Inscripcion]
(
	[id_sesion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [UQ_Socio_Sesion_Activa] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_Socio_Sesion_Activa] ON [dbo].[Inscripcion]
(
	[id_socio] ASC,
	[id_sesion] ASC
)
WHERE ([estado]='Inscrito')
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Pago_Contrato] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Pago_Contrato] ON [dbo].[Pago]
(
	[id_contrato] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Objeto: Index [IX_Sesion_Fecha_Hora] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Sesion_Fecha_Hora] ON [dbo].[Sesion]
(
	[fecha] ASC,
	[hora] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Objeto: Index [IX_Socio_Correo] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Socio_Correo] ON [dbo].[Socio]
(
	[correo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Objeto: Index [IX_Socio_Rut] Fecha de script: 23/10/2026 13:39:39 ******/
CREATE NONCLUSTERED INDEX [IX_Socio_Rut] ON [dbo].[Socio]
(
	[rut] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Contrato] ADD  CONSTRAINT [DF_Contrato_Estado]  DEFAULT ('Vigente') FOR [estado]
GO
ALTER TABLE [dbo].[Inscripcion] ADD  DEFAULT (sysdatetime()) FOR [fecha_inscripcion]
GO
ALTER TABLE [dbo].[Inscripcion] ADD  DEFAULT ('Inscrito') FOR [estado]
GO
ALTER TABLE [dbo].[Pago] ADD  DEFAULT (sysdatetime()) FOR [fecha_pago]
GO
ALTER TABLE [dbo].[Socio] ADD  DEFAULT ((0)) FOR [acepta_promociones]
GO
ALTER TABLE [dbo].[Socio] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[Ciudad]  WITH CHECK ADD  CONSTRAINT [FK_Ciudad_Comuna] FOREIGN KEY([id_comuna])
REFERENCES [dbo].[Comuna] ([id_comuna])
GO
ALTER TABLE [dbo].[Ciudad] CHECK CONSTRAINT [FK_Ciudad_Comuna]
GO
ALTER TABLE [dbo].[Comuna]  WITH CHECK ADD  CONSTRAINT [FK_Comuna_Provincia] FOREIGN KEY([id_provincia])
REFERENCES [dbo].[Provincia] ([id_provincia])
GO
ALTER TABLE [dbo].[Comuna] CHECK CONSTRAINT [FK_Comuna_Provincia]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [FK_Contrato_Plan] FOREIGN KEY([id_plan])
REFERENCES [dbo].[PlanMembresia] ([id_plan])
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [FK_Contrato_Plan]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [FK_Contrato_Socio] FOREIGN KEY([id_socio])
REFERENCES [dbo].[Socio] ([id_socio])
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [FK_Contrato_Socio]
GO
ALTER TABLE [dbo].[Equipamiento]  WITH CHECK ADD  CONSTRAINT [FK_Equipamiento_Sede] FOREIGN KEY([id_sede])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Equipamiento] CHECK CONSTRAINT [FK_Equipamiento_Sede]
GO
ALTER TABLE [dbo].[Inscripcion]  WITH CHECK ADD  CONSTRAINT [FK_Inscripcion_Sesion] FOREIGN KEY([id_sesion])
REFERENCES [dbo].[Sesion] ([id_sesion])
GO
ALTER TABLE [dbo].[Inscripcion] CHECK CONSTRAINT [FK_Inscripcion_Sesion]
GO
ALTER TABLE [dbo].[Inscripcion]  WITH CHECK ADD  CONSTRAINT [FK_Inscripcion_Socio] FOREIGN KEY([id_socio])
REFERENCES [dbo].[Socio] ([id_socio])
GO
ALTER TABLE [dbo].[Inscripcion] CHECK CONSTRAINT [FK_Inscripcion_Socio]
GO
ALTER TABLE [dbo].[Instructor]  WITH CHECK ADD  CONSTRAINT [FK_Instructor_Sede] FOREIGN KEY([id_sede_habitual])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Instructor] CHECK CONSTRAINT [FK_Instructor_Sede]
GO
ALTER TABLE [dbo].[Pago]  WITH CHECK ADD  CONSTRAINT [FK_Pago_Contrato] FOREIGN KEY([id_contrato])
REFERENCES [dbo].[Contrato] ([id_contrato])
GO
ALTER TABLE [dbo].[Pago] CHECK CONSTRAINT [FK_Pago_Contrato]
GO
ALTER TABLE [dbo].[Personal]  WITH CHECK ADD  CONSTRAINT [FK_Personal_Sede] FOREIGN KEY([id_sede])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Personal] CHECK CONSTRAINT [FK_Personal_Sede]
GO
ALTER TABLE [dbo].[Provincia]  WITH CHECK ADD  CONSTRAINT [FK_Provincia_Region] FOREIGN KEY([id_region])
REFERENCES [dbo].[Region] ([id_region])
GO
ALTER TABLE [dbo].[Provincia] CHECK CONSTRAINT [FK_Provincia_Region]
GO
ALTER TABLE [dbo].[Sede]  WITH CHECK ADD  CONSTRAINT [FK_Sede_Ciudad1] FOREIGN KEY([id_ciudad])
REFERENCES [dbo].[Ciudad] ([id_ciudad])
GO
ALTER TABLE [dbo].[Sede] CHECK CONSTRAINT [FK_Sede_Ciudad1]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [FK_Sesion_Clase] FOREIGN KEY([id_clase])
REFERENCES [dbo].[Clase] ([id_clase])
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [FK_Sesion_Clase]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [FK_Sesion_Instructor] FOREIGN KEY([id_instructor])
REFERENCES [dbo].[Instructor] ([id_instructor])
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [FK_Sesion_Instructor]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [FK_Sesion_Sede] FOREIGN KEY([id_sede])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [FK_Sesion_Sede]
GO
ALTER TABLE [dbo].[Socio]  WITH CHECK ADD  CONSTRAINT [FK_Socio_SedeRegistro] FOREIGN KEY([id_sede_registro])
REFERENCES [dbo].[Sede] ([id_sede])
GO
ALTER TABLE [dbo].[Socio] CHECK CONSTRAINT [FK_Socio_SedeRegistro]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Instructor] FOREIGN KEY([id_instructor])
REFERENCES [dbo].[Instructor] ([id_instructor])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Instructor]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Personal] FOREIGN KEY([id_personal])
REFERENCES [dbo].[Personal] ([id_personal])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Personal]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Rol] FOREIGN KEY([id_rol])
REFERENCES [dbo].[Rol] ([id_rol])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Rol]
GO
ALTER TABLE [dbo].[Usuario]  WITH CHECK ADD  CONSTRAINT [FK_Usuario_Socio] FOREIGN KEY([id_socio])
REFERENCES [dbo].[Socio] ([id_socio])
GO
ALTER TABLE [dbo].[Usuario] CHECK CONSTRAINT [FK_Usuario_Socio]
GO
ALTER TABLE [dbo].[Clase]  WITH CHECK ADD  CONSTRAINT [CK_Clase_Duracion] CHECK  (([duracion_minutos]>(0)))
GO
ALTER TABLE [dbo].[Clase] CHECK CONSTRAINT [CK_Clase_Duracion]
GO
ALTER TABLE [dbo].[Clase]  WITH CHECK ADD  CONSTRAINT [CK_Clase_Nivel] CHECK  (([nivel_exigencia]='Avanzado' OR [nivel_exigencia]='Intermedio' OR [nivel_exigencia]='Principiante'))
GO
ALTER TABLE [dbo].[Clase] CHECK CONSTRAINT [CK_Clase_Nivel]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [CK_Contrato_Estado] CHECK  (([estado]='Cancelado' OR [estado]='Vencido' OR [estado]='Vigente'))
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [CK_Contrato_Estado]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [CK_Contrato_Fechas] CHECK  (([fecha_termino]>=[fecha_inicio]))
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [CK_Contrato_Fechas]
GO
ALTER TABLE [dbo].[Contrato]  WITH CHECK ADD  CONSTRAINT [CK_Contrato_PrecioPactado] CHECK  (([precio_pactado]>=(0)))
GO
ALTER TABLE [dbo].[Contrato] CHECK CONSTRAINT [CK_Contrato_PrecioPactado]
GO
ALTER TABLE [dbo].[Inscripcion]  WITH CHECK ADD  CONSTRAINT [CK_Inscripcion_Estado] CHECK  (([estado]='Cancelado' OR [estado]='Inscrito'))
GO
ALTER TABLE [dbo].[Inscripcion] CHECK CONSTRAINT [CK_Inscripcion_Estado]
GO
ALTER TABLE [dbo].[Pago]  WITH CHECK ADD  CONSTRAINT [CK_Pago_Medio] CHECK  (([medio_pago]='Transferencia' OR [medio_pago]='Tarjeta' OR [medio_pago]='Efectivo'))
GO
ALTER TABLE [dbo].[Pago] CHECK CONSTRAINT [CK_Pago_Medio]
GO
ALTER TABLE [dbo].[Pago]  WITH CHECK ADD  CONSTRAINT [CK_Pago_Monto] CHECK  (([monto_cancelado]>(0)))
GO
ALTER TABLE [dbo].[Pago] CHECK CONSTRAINT [CK_Pago_Monto]
GO
ALTER TABLE [dbo].[PlanMembresia]  WITH CHECK ADD  CONSTRAINT [CK_Plan_Duracion] CHECK  (([duracion_meses]>(0)))
GO
ALTER TABLE [dbo].[PlanMembresia] CHECK CONSTRAINT [CK_Plan_Duracion]
GO
ALTER TABLE [dbo].[PlanMembresia]  WITH CHECK ADD  CONSTRAINT [CK_Plan_Precio] CHECK  (([precio_vigente]>=(0)))
GO
ALTER TABLE [dbo].[PlanMembresia] CHECK CONSTRAINT [CK_Plan_Precio]
GO
ALTER TABLE [dbo].[Sesion]  WITH CHECK ADD  CONSTRAINT [CK_Sesion_Cupo] CHECK  (([cupo_maximo]>(0)))
GO
ALTER TABLE [dbo].[Sesion] CHECK CONSTRAINT [CK_Sesion_Cupo]
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Jerarquía geográfica: Región > Provincia > Comuna > Ciudad (orden administrativo real de Chile; el enunciado la menciona como Región > Comuna > Provincia > Ciudad).' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'Region'
GO
USE [master]
GO
ALTER DATABASE [GimnasioDB] SET  READ_WRITE 
GO
