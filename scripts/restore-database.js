#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
require("dotenv").config();

// Reutilizar parser del script de exportación
const { parsePostgresUrl } = require("./export-database");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function restoreDatabase() {
  try {
    const backupDir = path.join(__dirname, "..", "backups");

    if (!fs.existsSync(backupDir)) {
      console.error("❌ Error: No existe la carpeta de backups");
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".sql"));

    if (files.length === 0) {
      console.error("❌ No hay archivos .sql en la carpeta de backups");
      process.exit(1);
    }

    console.log("\n📁 Backups disponibles:");
    files.forEach((f, i) => console.log(`${i + 1}. ${f}`));

    const index = await ask("\nSelecciona el número del backup a restaurar: ");
    const chosenFile = files[parseInt(index) - 1];

    if (!chosenFile) {
      console.error("❌ Selección inválida");
      process.exit(1);
    }

    const filepath = path.join(backupDir, chosenFile);
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.error("❌ Error: DATABASE_URL no configurada");
      process.exit(1);
    }

    const dbConfig = parsePostgresUrl(databaseUrl);

    console.log(`\n⚠️  ATENCIÓN: Se restaurará el backup '${chosenFile}'`);
    console.log(`📍 Base de datos destino: ${dbConfig.database} en ${dbConfig.host}`);
    console.log(`❗ Se recomienda que la base de datos esté vacía o tenga el mismo esquema.\n`);

    const confirm = await ask("¿Estás seguro de continuar? (y/n): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("🚫 Restauración cancelada");
      process.exit(0);
    }

    console.log("\n🔄 Iniciando restauración...");

    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    // Para la restauración usamos 'psql' ya que exportamos en formato SQL plano con --clean
    const args = [
      "-h", dbConfig.host,
      "-p", dbConfig.port,
      "-U", dbConfig.username,
      "-d", dbConfig.database,
      "-f", `"${filepath}"`
    ];

    const command = `psql ${args.join(" ")}`;

    execSync(command, {
      env,
      stdio: "inherit",
    });

    console.log("\n✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE");

  } catch (error) {
    console.error("\n❌ Error durante la restauración:");
    if (error.message.includes("psql")) {
      console.error("💡 Asegúrate de tener 'psql' en tu PATH.");
    }
    console.error(error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  restoreDatabase();
}
