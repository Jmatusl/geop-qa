#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Script para exportar la base de datos PostgreSQL
 * Utiliza la variable POSTGRES_DATABASE_URL del archivo .env
 */

function checkPgDumpAvailable() {
  try {
    execSync("pg_dump --version", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

function parsePostgresUrl(url) {
  try {
    // Remover espacios en blanco al inicio y final
    url = url.trim();
    console.log("🔍 Parseando URL de base de datos...");

    // Regex que maneja puerto opcional
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/([^?]+)(\?.*)?/;
    const match = url.match(regex);

    if (!match) {
      console.error("❌ URL no coincide con el patrón esperado");
      console.error("📋 URL recibida (primeros 50 caracteres):", url.substring(0, 50) + "...");
      console.error("📋 Formato esperado: postgresql://usuario:contraseña@host[:puerto]/database[?params]");
      throw new Error("Formato de URL de PostgreSQL inválido");
    }

    const result = {
      username: match[1],
      password: match[2],
      host: match[3],
      port: match[4] || "5432", // Puerto por defecto si no se especifica
      database: match[5],
      params: match[6] || "",
    };

    console.log("✅ URL parseada correctamente");
    console.log(`📊 Base de datos: ${result.database}`);
    console.log(`🌐 Host: ${result.host}:${result.port}`);
    console.log(`👤 Usuario: ${result.username}`);

    return result;
  } catch (error) {
    console.error("❌ Error al parsear la URL de PostgreSQL:", error.message);
    throw error;
  }
}

function exportDatabase() {
  try {
    console.log("🔄 Iniciando exportación de la base de datos...");

    // Verificar que pg_dump está disponible
    if (!checkPgDumpAvailable()) {
      console.error("❌ Error: pg_dump no está disponible en el sistema");
      console.error("💡 Instalación requerida:");
      console.error("   - Windows: Instala PostgreSQL desde https://www.postgresql.org/download/windows/");
      console.error("   - macOS: brew install postgresql");
      console.error("   - Linux: sudo apt-get install postgresql-client");
      console.error("   - Después de instalar, reinicia tu terminal");
      process.exit(1);
    }

    // Verificar que existe la variable de entorno
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error("❌ Error: DATABASE_URL no está configurada en el archivo .env");
      process.exit(1);
    }

    // Parsear la URL de la base de datos
    const dbConfig = parsePostgresUrl(databaseUrl);

    // Crear directorio de backups si no existe
    const backupDir = path.join(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Directorio de backups creado: ${backupDir}`);
    }

    // Generar nombre del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "-").split("T").join("_").slice(0, -5); // Remover los últimos caracteres del timestamp

    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);

    // Configurar variables de entorno para pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
      PGHOST: dbConfig.host,
      PGPORT: dbConfig.port,
      PGUSER: dbConfig.username,
      PGDATABASE: dbConfig.database,
    };

    // Comando pg_dump con opciones optimizadas
    const pgDumpCommand = ["pg_dump", "--verbose", "--clean", "--if-exists", "--no-owner", "--no-privileges", "--format=custom", "--compress=9", `--file="${filepath.replace(".sql", ".backup")}"`, dbConfig.database].join(" ");

    console.log("🚀 Ejecutando pg_dump...");
    console.log(`📝 Comando: ${pgDumpCommand.replace(dbConfig.password, "***")}`);

    // Ejecutar el comando
    execSync(pgDumpCommand, {
      env,
      stdio: "inherit",
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });

    // También crear un dump en formato SQL plano
    const sqlDumpCommand = ["pg_dump", "--verbose", "--clean", "--if-exists", "--no-owner", "--no-privileges", "--inserts", `--file="${filepath}"`, dbConfig.database].join(" ");

    console.log("🔄 Creando también backup en formato SQL...");
    execSync(sqlDumpCommand, {
      env,
      stdio: "inherit",
      maxBuffer: 1024 * 1024 * 100,
    });

    // Verificar que los archivos se crearon
    const backupFile = filepath.replace(".sql", ".backup");
    const sqlFile = filepath;

    if (fs.existsSync(backupFile) && fs.existsSync(sqlFile)) {
      const backupStats = fs.statSync(backupFile);
      const sqlStats = fs.statSync(sqlFile);

      console.log("✅ Exportación completada exitosamente!");
      console.log("📄 Archivos generados:");
      console.log(`   🗜️  Formato comprimido: ${backupFile} (${(backupStats.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`   📝 Formato SQL: ${sqlFile} (${(sqlStats.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log("");
      console.log("💡 Para restaurar el backup comprimido usa:");
      console.log(`   pg_restore --verbose --clean --no-acl --no-owner -d <database_name> "${backupFile}"`);
      console.log("");
      console.log("💡 Para restaurar el backup SQL usa:");
      console.log(`   psql -d <database_name> -f "${sqlFile}"`);
    } else {
      console.error("❌ Error: Los archivos de backup no se crearon correctamente");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error durante la exportación:");

    if (error.message.includes("pg_dump")) {
      console.error("💡 Asegúrate de tener PostgreSQL instalado y pg_dump disponible en tu PATH");
      console.error("   - Windows: Instala PostgreSQL desde https://www.postgresql.org/download/windows/");
      console.error("   - macOS: brew install postgresql");
      console.error("   - Linux: sudo apt-get install postgresql-client");
    }

    console.error("📋 Detalles del error:", error.message);
    process.exit(1);
  }
}

// Ejecutar el script
if (require.main === module) {
  exportDatabase();
}

module.exports = { exportDatabase, parsePostgresUrl };
